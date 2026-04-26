import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import {
  CreateManualPaymentDto,
  CreatePaymentDto,
  RejectPaymentDto,
} from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';

// Note: with the multi-group model, "the student's monthly fee" is the
// SUM of monthlyFee across all of their StudentGroup links. We keep
// returning a `monthlyFee` field on student summaries for backwards
// compatibility, computed at read time.
const paymentSelect = {
  id: true,
  amount: true,
  status: true,
  receiptUrl: true,
  nextPaymentDate: true,
  confirmedAt: true,
  rejectedAt: true,
  rejectReason: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      fullName: true,
      groups: {
        select: {
          monthlyFee: true,
          group: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: 'asc' as const },
      },
    },
  },
} satisfies Prisma.PaymentSelect;

type RawPayment = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

function shapePayment(p: RawPayment) {
  const groups = p.student.groups.map((link) => ({
    id: link.group.id,
    name: link.group.name,
    monthlyFee: Number(link.monthlyFee),
  }));
  const monthlyFee = groups.reduce((acc, g) => acc + g.monthlyFee, 0);
  const primaryGroup = groups[0] ?? null;
  return {
    id: p.id,
    amount: p.amount,
    status: p.status,
    receiptUrl: p.receiptUrl,
    nextPaymentDate: p.nextPaymentDate,
    confirmedAt: p.confirmedAt,
    rejectedAt: p.rejectedAt,
    rejectReason: p.rejectReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    student: {
      id: p.student.id,
      fullName: p.student.fullName,
      monthlyFee,
      group: primaryGroup
        ? { id: primaryGroup.id, name: primaryGroup.name }
        : null,
      groups,
    },
  };
}

async function totalMonthlyFeeForStudent(
  prisma: PrismaService,
  studentId: string,
) {
  const links = await prisma.studentGroup.findMany({
    where: { studentId },
    select: { monthlyFee: true },
  });
  return links.reduce((acc, l) => acc + Number(l.monthlyFee), 0);
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async create(dto: CreatePaymentDto, actorId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const payment = await this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        amount: dto.amount,
        status: PaymentStatus.PENDING,
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : null,
      },
      select: paymentSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
        details: {
          amount: dto.amount,
          studentId: dto.studentId,
        } as Prisma.InputJsonValue,
      },
    });

    return shapePayment(payment);
  }

  /**
   * Admin-entered (cash/transfer) payment. Stored as CONFIRMED right away —
   * the parent isn't involved. A receipt file is optional and, when provided,
   * uploaded to S3 and attached to the same payment record.
   */
  async createManual(
    dto: CreateManualPaymentDto,
    file: Express.Multer.File | undefined,
    actorId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      throw new BadRequestException('Invalid paidAt');
    }

    let receiptUrl: string | null = null;
    if (file) {
      receiptUrl = await this.s3.uploadFile(file, 'receipts');
    }

    const payment = await this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        amount: dto.amount,
        status: PaymentStatus.CONFIRMED,
        receiptUrl,
        // The chosen paidAt drives both the "когда оплатил" timeline and the
        // confirmation timestamp so reports/debt calculations treat it as a
        // payment for that month.
        createdAt: paidAt,
        confirmedAt: paidAt,
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : null,
      },
      select: paymentSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE_MANUAL_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
        details: {
          amount: dto.amount,
          studentId: dto.studentId,
          paidAt: paidAt.toISOString(),
          receiptAttached: Boolean(receiptUrl),
        } as Prisma.InputJsonValue,
      },
    });

    return shapePayment(payment);
  }

  async findAll(query: QueryPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) (where.createdAt as any).gte = new Date(query.from);
      if (query.to) (where.createdAt as any).lte = new Date(query.to);
    }
    if (query.groupId) {
      // Filter to students enrolled in the requested group via the
      // many-to-many StudentGroup link.
      where.student = { groups: { some: { groupId: query.groupId } } };
    }

    const rows = await this.prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(shapePayment);
  }

  async findByStudent(studentId: string, user: { id: string; role: Role }) {
    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
      });
      if (!student || student.id !== studentId)
        throw new ForbiddenException('You can only view your own payments');
    }

    if (user.role === Role.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { studentId, parent: { userId: user.id } },
        select: { parentId: true },
      });
      if (!link)
        throw new ForbiddenException("You can only view your child's payments");
    }

    const rows = await this.prisma.payment.findMany({
      where: { studentId },
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(shapePayment);
  }

  async findMy(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Student profile not found');

    const monthlyFee = await totalMonthlyFeeForStudent(this.prisma, student.id);

    const rawHistory = await this.prisma.payment.findMany({
      where: { studentId: student.id },
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
    });
    const history = rawHistory.map(shapePayment);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthPayments = history.filter(
      (p) => new Date(p.createdAt) >= startOfMonth,
    );
    const isPaid = thisMonthPayments.some(
      (p) => p.status === PaymentStatus.CONFIRMED,
    );
    const isPending = thisMonthPayments.some(
      (p) => p.status === PaymentStatus.PENDING,
    );

    let currentStatus = 'UNPAID';
    if (isPaid) currentStatus = 'PAID';
    else if (isPending) currentStatus = 'PENDING';

    const lastConfirmed = history.find(
      (p) => p.status === PaymentStatus.CONFIRMED,
    );
    let nextPaymentDate: Date | null = null;
    let daysUntilPayment: number | null = null;

    if (lastConfirmed && lastConfirmed.nextPaymentDate) {
      nextPaymentDate = lastConfirmed.nextPaymentDate;
      const diffTime = nextPaymentDate.getTime() - now.getTime();
      daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      currentMonth: {
        status: currentStatus,
        amount: monthlyFee,
        nextPaymentDate,
        daysUntilPayment,
      },
      history,
    };
  }

  async uploadReceipt(
    file: Express.Multer.File,
    studentId: string,
    actorId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const monthlyFee = await totalMonthlyFeeForStudent(this.prisma, studentId);

    const receiptUrl = await this.s3.uploadFile(file, 'receipts');

    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        amount: monthlyFee,
        status: PaymentStatus.PENDING,
        receiptUrl,
      },
      select: paymentSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPLOAD_RECEIPT',
        entity: 'Payment',
        entityId: payment.id,
        details: { receiptUrl } as Prisma.InputJsonValue,
      },
    });

    return shapePayment(payment);
  }

  async confirm(id: string, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      select: paymentSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CONFIRM_PAYMENT',
        entity: 'Payment',
        entityId: id,
      },
    });

    return shapePayment(updated);
  }

  async reject(id: string, dto: RejectPaymentDto, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REJECTED,
        rejectedAt: new Date(),
        rejectReason: dto.rejectReason,
      },
      select: paymentSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'REJECT_PAYMENT',
        entity: 'Payment',
        entityId: id,
        details: { rejectReason: dto.rejectReason } as Prisma.InputJsonValue,
      },
    });

    return shapePayment(updated);
  }

  async getReceiptUrl(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: { receiptUrl: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!payment.receiptUrl) throw new NotFoundException('Receipt not found');
    const url = await this.s3.getPresignedUrl(payment.receiptUrl);
    return { url };
  }

  async getDebtors() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const confirmedThisMonth = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: { gte: startOfMonth },
      },
      select: { studentId: true },
    });

    const paidStudentIds = new Set(confirmedThisMonth.map((p) => p.studentId));

    const allStudents = await this.prisma.student.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        groups: {
          select: {
            monthlyFee: true,
            group: { select: { id: true, name: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        payments: {
          where: { status: PaymentStatus.CONFIRMED },
          orderBy: { confirmedAt: 'desc' },
          take: 1,
          select: { confirmedAt: true },
        },
      },
    });

    return allStudents
      .filter((s) => !paidStudentIds.has(s.id))
      .map((s) => {
        const groups = s.groups.map((link) => ({
          id: link.group.id,
          name: link.group.name,
          monthlyFee: Number(link.monthlyFee),
        }));
        const monthlyFee = groups.reduce((acc, g) => acc + g.monthlyFee, 0);
        return {
          studentId: s.id,
          fullName: s.fullName,
          groupName:
            groups.length === 0
              ? '—'
              : groups.length === 1
                ? groups[0].name
                : groups.map((g) => g.name).join(', '),
          monthlyFee,
          groups,
          lastPaymentDate: s.payments[0]?.confirmedAt ?? null,
        };
      });
  }
}
