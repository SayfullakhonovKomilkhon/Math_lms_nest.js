import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

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
} satisfies Prisma.ExpenseSelect;

type RawExpense = Prisma.ExpenseGetPayload<{ select: typeof expenseSelect }>;

// We intentionally cast Decimal -> number on the boundary. The amounts here
// are operating costs (max ~10 digits + 2 decimals); JS number precision is
// fine for that range and keeps the API consumer simple.
function shape(e: RawExpense) {
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

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async create(
    dto: CreateExpenseDto,
    file: Express.Multer.File | undefined,
    actorId: string,
  ) {
    const spentAt = dto.spentAt ? new Date(dto.spentAt) : new Date();
    if (Number.isNaN(spentAt.getTime())) {
      throw new BadRequestException('Invalid spentAt');
    }

    let receiptUrl: string | null = null;
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
        } as Prisma.InputJsonValue,
      },
    });

    return shape(expense);
  }

  async findAll(query: QueryExpensesDto) {
    const where: Prisma.ExpenseWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.from || query.to) {
      where.spentAt = {};
      if (query.from) (where.spentAt as Prisma.DateTimeFilter).gte = new Date(query.from);
      if (query.to) (where.spentAt as Prisma.DateTimeFilter).lte = new Date(query.to);
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
      // Total spent across the FILTERED set, so the UI can show "за период:
      // X сум" right next to the filter chips.
      totalAmount: Number(sumAgg._sum.amount ?? 0),
      limit,
      offset,
    };
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: expenseSelect,
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return shape(expense);
  }

  async update(id: string, dto: UpdateExpenseDto, actorId: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');

    const data: Prisma.ExpenseUpdateInput = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.spentAt !== undefined) {
      const spentAt = new Date(dto.spentAt);
      if (Number.isNaN(spentAt.getTime())) {
        throw new BadRequestException('Invalid spentAt');
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
        details: dto as Prisma.InputJsonValue,
      },
    });

    return shape(updated);
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');

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
        } as Prisma.InputJsonValue,
      },
    });

    return { success: true };
  }

  async attachReceipt(
    id: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');

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
        details: { receiptUrl } as Prisma.InputJsonValue,
      },
    });

    return shape(updated);
  }

  async getReceiptUrl(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: { receiptUrl: true },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    if (!expense.receiptUrl) throw new NotFoundException('Receipt not found');
    const url = await this.s3.getPresignedUrl(expense.receiptUrl);
    return { url };
  }

  // Lightweight summary for dashboards/category chips. Returns the unique
  // categories the workspace has used so far (for the autocomplete on the
  // create form) plus per-category totals for the current month.
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
        // Prisma's groupBy types model `_count` as `true | { category: number }`
        // depending on the input shape; with the `{ category: true }` we passed
        // it's always the object form, so the cast is safe.
        usageCount:
          (row._count as { category?: number } | undefined)?.category ?? 0,
      })),
      monthByCategory: byCategoryMonth.map((row) => ({
        category: row.category,
        amount: Number(row._sum?.amount ?? 0),
      })),
      monthTotal: Number(monthTotal._sum.amount ?? 0),
      monthStart,
    };
  }
}
