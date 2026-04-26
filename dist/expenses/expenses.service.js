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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3_service_1 = require("../common/services/s3.service");
const expenseSelect = {
    id: true,
    amount: true,
    category: true,
    description: true,
    receiptUrl: true,
    spentAt: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
};
function shape(e) {
    return {
        id: e.id,
        amount: Number(e.amount),
        category: e.category,
        description: e.description,
        receiptUrl: e.receiptUrl,
        spentAt: e.spentAt,
        createdById: e.createdById,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
    };
}
let ExpensesService = class ExpensesService {
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async create(dto, file, actorId) {
        const spentAt = dto.spentAt ? new Date(dto.spentAt) : new Date();
        if (Number.isNaN(spentAt.getTime())) {
            throw new common_1.BadRequestException('Invalid spentAt');
        }
        let receiptUrl = null;
        if (file) {
            receiptUrl = await this.s3.uploadFile(file, 'expenses');
        }
        const expense = await this.prisma.expense.create({
            data: {
                amount: dto.amount,
                category: dto.category.trim(),
                description: dto.description?.trim() || null,
                receiptUrl,
                spentAt,
                createdById: actorId,
            },
            select: expenseSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'CREATE_EXPENSE',
                entity: 'Expense',
                entityId: expense.id,
                details: {
                    amount: dto.amount,
                    category: dto.category,
                    spentAt: spentAt.toISOString(),
                    receiptAttached: Boolean(receiptUrl),
                },
            },
        });
        return shape(expense);
    }
    async findAll(query) {
        const where = {};
        if (query.category)
            where.category = query.category;
        if (query.from || query.to) {
            where.spentAt = {};
            if (query.from)
                where.spentAt.gte = new Date(query.from);
            if (query.to)
                where.spentAt.lte = new Date(query.to);
        }
        if (query.search) {
            const q = query.search.trim();
            if (q.length > 0) {
                where.OR = [
                    { category: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ];
            }
        }
        const limit = query.limit ?? 100;
        const offset = query.offset ?? 0;
        const [rows, total, sumAgg] = await this.prisma.$transaction([
            this.prisma.expense.findMany({
                where,
                select: expenseSelect,
                orderBy: [{ spentAt: 'desc' }, { createdAt: 'desc' }],
                take: limit,
                skip: offset,
            }),
            this.prisma.expense.count({ where }),
            this.prisma.expense.aggregate({
                where,
                _sum: { amount: true },
            }),
        ]);
        return {
            items: rows.map(shape),
            total,
            totalAmount: Number(sumAgg._sum.amount ?? 0),
            limit,
            offset,
        };
    }
    async findOne(id) {
        const expense = await this.prisma.expense.findUnique({
            where: { id },
            select: expenseSelect,
        });
        if (!expense)
            throw new common_1.NotFoundException('Expense not found');
        return shape(expense);
    }
    async update(id, dto, actorId) {
        const existing = await this.prisma.expense.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Expense not found');
        const data = {};
        if (dto.amount !== undefined)
            data.amount = dto.amount;
        if (dto.category !== undefined)
            data.category = dto.category.trim();
        if (dto.description !== undefined) {
            data.description = dto.description?.trim() || null;
        }
        if (dto.spentAt !== undefined) {
            const spentAt = new Date(dto.spentAt);
            if (Number.isNaN(spentAt.getTime())) {
                throw new common_1.BadRequestException('Invalid spentAt');
            }
            data.spentAt = spentAt;
        }
        const updated = await this.prisma.expense.update({
            where: { id },
            data,
            select: expenseSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE_EXPENSE',
                entity: 'Expense',
                entityId: id,
                details: dto,
            },
        });
        return shape(updated);
    }
    async remove(id, actorId) {
        const existing = await this.prisma.expense.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Expense not found');
        await this.prisma.expense.delete({ where: { id } });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'DELETE_EXPENSE',
                entity: 'Expense',
                entityId: id,
                details: {
                    amount: Number(existing.amount),
                    category: existing.category,
                },
            },
        });
        return { success: true };
    }
    async attachReceipt(id, file, actorId) {
        if (!file)
            throw new common_1.BadRequestException('File is required');
        const existing = await this.prisma.expense.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Expense not found');
        const receiptUrl = await this.s3.uploadFile(file, 'expenses');
        const updated = await this.prisma.expense.update({
            where: { id },
            data: { receiptUrl },
            select: expenseSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'ATTACH_EXPENSE_RECEIPT',
                entity: 'Expense',
                entityId: id,
                details: { receiptUrl },
            },
        });
        return shape(updated);
    }
    async getReceiptUrl(id) {
        const expense = await this.prisma.expense.findUnique({
            where: { id },
            select: { receiptUrl: true },
        });
        if (!expense)
            throw new common_1.NotFoundException('Expense not found');
        if (!expense.receiptUrl)
            throw new common_1.NotFoundException('Receipt not found');
        const url = await this.s3.getPresignedUrl(expense.receiptUrl);
        return { url };
    }
    async getSummary() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const [byCategoryAll, byCategoryMonth, monthTotal] = await this.prisma.$transaction([
            this.prisma.expense.groupBy({
                by: ['category'],
                _count: { category: true },
                orderBy: { _count: { category: 'desc' } },
            }),
            this.prisma.expense.groupBy({
                by: ['category'],
                where: { spentAt: { gte: monthStart, lt: nextMonthStart } },
                _sum: { amount: true },
                orderBy: { _sum: { amount: 'desc' } },
            }),
            this.prisma.expense.aggregate({
                where: { spentAt: { gte: monthStart, lt: nextMonthStart } },
                _sum: { amount: true },
            }),
        ]);
        return {
            categories: byCategoryAll.map((row) => ({
                name: row.category,
                usageCount: row._count?.category ?? 0,
            })),
            monthByCategory: byCategoryMonth.map((row) => ({
                category: row.category,
                amount: Number(row._sum?.amount ?? 0),
            })),
            monthTotal: Number(monthTotal._sum.amount ?? 0),
            monthStart,
        };
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3_service_1.S3Service])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map