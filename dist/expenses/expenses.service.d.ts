import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
export declare class ExpensesService {
    private prisma;
    private s3;
    constructor(prisma: PrismaService, s3: S3Service);
    create(dto: CreateExpenseDto, file: Express.Multer.File | undefined, actorId: string): Promise<{
        id: string;
        amount: number;
        category: string;
        description: string | null;
        receiptUrl: string | null;
        spentAt: Date;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(query: QueryExpensesDto): Promise<{
        items: {
            id: string;
            amount: number;
            category: string;
            description: string | null;
            receiptUrl: string | null;
            spentAt: Date;
            createdById: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalAmount: number;
        limit: number;
        offset: number;
    }>;
    findOne(id: string): Promise<{
        id: string;
        amount: number;
        category: string;
        description: string | null;
        receiptUrl: string | null;
        spentAt: Date;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateExpenseDto, actorId: string): Promise<{
        id: string;
        amount: number;
        category: string;
        description: string | null;
        receiptUrl: string | null;
        spentAt: Date;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string, actorId: string): Promise<{
        success: boolean;
    }>;
    attachReceipt(id: string, file: Express.Multer.File, actorId: string): Promise<{
        id: string;
        amount: number;
        category: string;
        description: string | null;
        receiptUrl: string | null;
        spentAt: Date;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getReceiptUrl(id: string): Promise<{
        url: string;
    }>;
    getSummary(): Promise<{
        categories: {
            name: string;
            usageCount: number;
        }[];
        monthByCategory: {
            category: string;
            amount: number;
        }[];
        monthTotal: number;
        monthStart: Date;
    }>;
}
