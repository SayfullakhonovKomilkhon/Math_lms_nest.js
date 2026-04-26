"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const s3_service_1 = require("../common/services/s3.service");
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
                orderBy: { joinedAt: 'asc' },
            },
        },
    },
};
function shapePayment(p) {
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
async function totalMonthlyFeeForStudent(prisma, studentId) {
    const links = await prisma.studentGroup.findMany({
        where: { studentId },
        select: { monthlyFee: true },
    });
    return links.reduce((acc, l) => acc + Number(l.monthlyFee), 0);
}
let PaymentsService = class PaymentsService {
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async create(dto, actorId) {
        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const payment = await this.prisma.payment.create({
            data: {
                studentId: dto.studentId,
                amount: dto.amount,
                status: client_1.PaymentStatus.PENDING,
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
                },
            },
        });
        return shapePayment(payment);
    }
    async createManual(dto, file, actorId) {
        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
        if (Number.isNaN(paidAt.getTime())) {
            throw new common_1.BadRequestException('Invalid paidAt');
        }
        let receiptUrl = null;
        if (file) {
            receiptUrl = await this.s3.uploadFile(file, 'receipts');
        }
        const payment = await this.prisma.payment.create({
            data: {
                studentId: dto.studentId,
                amount: dto.amount,
                status: client_1.PaymentStatus.CONFIRMED,
                receiptUrl,
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
                },
            },
        });
        return shapePayment(payment);
    }
    async findAll(query) {
        const where = {};
        if (query.studentId)
            where.studentId = query.studentId;
        if (query.status)
            where.status = query.status;
        if (query.from || query.to) {
            where.createdAt = {};
            if (query.from)
                where.createdAt.gte = new Date(query.from);
            if (query.to)
                where.createdAt.lte = new Date(query.to);
        }
        if (query.groupId) {
            where.student = { groups: { some: { groupId: query.groupId } } };
        }
        const rows = await this.prisma.payment.findMany({
            where,
            select: paymentSelect,
            orderBy: { createdAt: 'desc' },
        });
        return rows.map(shapePayment);
    }
    async findByStudent(studentId, user) {
        if (user.role === client_1.Role.STUDENT) {
            const student = await this.prisma.student.findUnique({
                where: { userId: user.id },
            });
            if (!student || student.id !== studentId)
                throw new common_1.ForbiddenException('You can only view your own payments');
        }
        if (user.role === client_1.Role.PARENT) {
            const link = await this.prisma.parentStudent.findFirst({
                where: { studentId, parent: { userId: user.id } },
                select: { parentId: true },
            });
            if (!link)
                throw new common_1.ForbiddenException("You can only view your child's payments");
        }
        const rows = await this.prisma.payment.findMany({
            where: { studentId },
            select: paymentSelect,
            orderBy: { createdAt: 'desc' },
        });
        return rows.map(shapePayment);
    }
    async findMy(userId) {
        const student = await this.prisma.student.findUnique({ where: { userId } });
        if (!student)
            throw new common_1.NotFoundException('Student profile not found');
        const monthlyFee = await totalMonthlyFeeForStudent(this.prisma, student.id);
        const rawHistory = await this.prisma.payment.findMany({
            where: { studentId: student.id },
            select: paymentSelect,
            orderBy: { createdAt: 'desc' },
        });
        const history = rawHistory.map(shapePayment);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthPayments = history.filter((p) => new Date(p.createdAt) >= startOfMonth);
        const isPaid = thisMonthPayments.some((p) => p.status === client_1.PaymentStatus.CONFIRMED);
        const isPending = thisMonthPayments.some((p) => p.status === client_1.PaymentStatus.PENDING);
        let currentStatus = 'UNPAID';
        if (isPaid)
            currentStatus = 'PAID';
        else if (isPending)
            currentStatus = 'PENDING';
        const lastConfirmed = history.find((p) => p.status === client_1.PaymentStatus.CONFIRMED);
        let nextPaymentDate = null;
        let daysUntilPayment = null;
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
    async uploadReceipt(file, studentId, actorId) {
        if (!file)
            throw new common_1.BadRequestException('File is required');
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const monthlyFee = await totalMonthlyFeeForStudent(this.prisma, studentId);
        const receiptUrl = await this.s3.uploadFile(file, 'receipts');
        const payment = await this.prisma.payment.create({
            data: {
                studentId,
                amount: monthlyFee,
                status: client_1.PaymentStatus.PENDING,
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
                details: { receiptUrl },
            },
        });
        return shapePayment(payment);
    }
    async confirm(id, actorId) {
        const payment = await this.prisma.payment.findUnique({ where: { id } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        const updated = await this.prisma.payment.update({
            where: { id },
            data: {
                status: client_1.PaymentStatus.CONFIRMED,
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
    async reject(id, dto, actorId) {
        const payment = await this.prisma.payment.findUnique({ where: { id } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        const updated = await this.prisma.payment.update({
            where: { id },
            data: {
                status: client_1.PaymentStatus.REJECTED,
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
                details: { rejectReason: dto.rejectReason },
            },
        });
        return shapePayment(updated);
    }
    async getReceiptUrl(id) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
            select: { receiptUrl: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        if (!payment.receiptUrl)
            throw new common_1.NotFoundException('Receipt not found');
        const url = await this.s3.getPresignedUrl(payment.receiptUrl);
        return { url };
    }
    async getDebtors() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const confirmedThisMonth = await this.prisma.payment.findMany({
            where: {
                status: client_1.PaymentStatus.CONFIRMED,
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
                    where: { status: client_1.PaymentStatus.CONFIRMED },
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
                groupName: groups.length === 0
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
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3_service_1.S3Service])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map