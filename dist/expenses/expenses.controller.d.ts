import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';
export declare class ExpensesController {
    private service;
    constructor(service: ExpensesService);
    create(file: Express.Multer.File | undefined, dto: CreateExpenseDto, actorId: string): Promise<{
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
    remove(id: string, actorId: string): Promise<{
        success: boolean;
    }>;
}
