import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreatePaymentDto, RejectPaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';

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
      monthlyFee: true,
      group: { select: { id: true, name: true } },
    },
  },
};

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async create(dto: CreatePaymentDto, actorId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const payment = await this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        amount: dto.amount,
        status: PaymentStatus.PENDING,
        nextPaymentDate: dto.nextPaymentDate ? new Date(dto.nextPaymentDate) : null,
      },
      select: paymentSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
        details: { amount: dto.amount, studentId: dto.studentId } as Prisma.InputJsonValue,
      },
    });

    return payment;
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
      where.student = { groupId: query.groupId };
    }

    return this.prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStudent(studentId: string, user: { id: string; role: Role }) {
    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { userId: user.id } });
      if (!student || student.id !== studentId)
        throw new ForbiddenException('You can only view your own payments');
    }

    if (user.role === Role.PARENT) {
      const parent = await this.prisma.parent.findUnique({ where: { userId: user.id } });
      if (!parent || parent.studentId !== studentId)
        throw new ForbiddenException('You can only view your child\'s payments');
    }

    return this.prisma.payment.findMany({
      where: { studentId },
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMy(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Student profile not found');

    const history = await this.prisma.payment.findMany({
      where: { studentId: student.id },
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthPayments = history.filter((p) => new Date(p.createdAt) >= startOfMonth);
    const isPaid = thisMonthPayments.some((p) => p.status === PaymentStatus.CONFIRMED);
    const isPending = thisMonthPayments.some((p) => p.status === PaymentStatus.PENDING);
    
    let currentStatus = 'UNPAID';
    if (isPaid) currentStatus = 'PAID';
    else if (isPending) currentStatus = 'PENDING';

    const lastConfirmed = history.find((p) => p.status === PaymentStatus.CONFIRMED);
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
        amount: Number(student.monthlyFee),
        nextPaymentDate,
        daysUntilPayment,
      },
      history,
    };
  }

  async uploadReceipt(file: Express.Multer.File, studentId: string, actorId: string) {
    if (!file) throw new BadRequestException('File is required');

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const receiptUrl = await this.s3.uploadFile(file, 'receipts');

    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        amount: student.monthlyFee,
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

    return payment;
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

    return updated;
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

    return updated;
  }

  async getDebtors() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Students without a CONFIRMED payment this month
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
        monthlyFee: true,
        group: { select: { id: true, name: true } },
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
      .map((s) => ({
        studentId: s.id,
        fullName: s.fullName,
        groupName: s.group?.name ?? '—',
        monthlyFee: s.monthlyFee,
        lastPaymentDate: s.payments[0]?.confirmedAt ?? null,
      }));
  }
}
