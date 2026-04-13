import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
export declare class HomeworkService {
    private prisma;
    constructor(prisma: PrismaService);
    private getTeacher;
    private assertTeacherOwnsGroup;
    create(dto: CreateHomeworkDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
        text: string;
        imageUrls: string[];
        youtubeUrl: string | null;
        dueDate: Date | null;
    }>;
    findAll(groupId: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
        text: string;
        imageUrls: string[];
        youtubeUrl: string | null;
        dueDate: Date | null;
    }[]>;
    findLatest(groupId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
        text: string;
        imageUrls: string[];
        youtubeUrl: string | null;
        dueDate: Date | null;
    } | null>;
    findMy(limit: number, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
        text: string;
        imageUrls: string[];
        youtubeUrl: string | null;
        dueDate: Date | null;
    }[]>;
    findMyLatest(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
        text: string;
        imageUrls: string[];
        youtubeUrl: string | null;
        dueDate: Date | null;
    } | null>;
    update(id: string, dto: UpdateHomeworkDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
        text: string;
        imageUrls: string[];
        youtubeUrl: string | null;
        dueDate: Date | null;
    }>;
    remove(id: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        deleted: boolean;
    }>;
}
