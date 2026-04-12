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
            monthlyFee: true,
            group: { select: { id: true, name: true } },
        },
    },
};
let PaymentsService = class PaymentsService {
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async create(dto, actorId) {
        const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const payment = await this.prisma.payment.create({
            data: {
                studentId: dto.studentId,
                amount: dto.amount,
                status: client_1.PaymentStatus.PENDING,
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
                details: { amount: dto.amount, studentId: dto.studentId },
            },
        });
        return payment;
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
            where.student = { groupId: query.groupId };
        }
        return this.prisma.payment.findMany({
            where,
            select: paymentSelect,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByStudent(studentId, user) {
        if (user.role === client_1.Role.STUDENT) {
            const student = await this.prisma.student.findUnique({ where: { userId: user.id } });
            if (!student || student.id !== studentId)
                throw new common_1.ForbiddenException('You can only view your own payments');
        }
        if (user.role === client_1.Role.PARENT) {
            const parent = await this.prisma.parent.findUnique({ where: { userId: user.id } });
            if (!parent || parent.studentId !== studentId)
                throw new common_1.ForbiddenException('You can only view your child\'s payments');
        }
        return this.prisma.payment.findMany({
            where: { studentId },
            select: paymentSelect,
            orderBy: { createdAt: 'desc' },
        });
    }
    async uploadReceipt(file, studentId, actorId) {
        if (!file)
            throw new common_1.BadRequestException('File is required');
        const student = await this.prisma.student.findUnique({ where: { id: studentId } });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const receiptUrl = await this.s3.uploadFile(file, 'receipts');
        const payment = await this.prisma.payment.create({
            data: {
                studentId,
                amount: student.monthlyFee,
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
        return payment;
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
        return updated;
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
        return updated;
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
                monthlyFee: true,
                group: { select: { id: true, name: true } },
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
            .map((s) => ({
            studentId: s.id,
            fullName: s.fullName,
            groupName: s.group?.name ?? '—',
            monthlyFee: s.monthlyFee,
            lastPaymentDate: s.payments[0]?.confirmedAt ?? null,
        }));
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3_service_1.S3Service])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map