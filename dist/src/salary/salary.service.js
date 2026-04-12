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
exports.SalaryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SalaryService = class SalaryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMySalary(userId) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { userId },
            include: {
                groups: {
                    where: { isActive: true },
                    include: {
                        _count: { select: { students: { where: { isActive: true } } } },
                    },
                },
            },
        });
        if (!teacher)
            throw new common_1.ForbiddenException('Teacher profile not found');
        const studentCount = teacher.groups.reduce((sum, g) => sum + g._count.students, 0);
        const rate = Number(teacher.ratePerStudent);
        const totalSalary = studentCount * rate;
        return {
            teacherId: teacher.id,
            fullName: teacher.fullName,
            studentCount,
            ratePerStudent: rate,
            totalSalary,
            groups: teacher.groups.map((g) => ({
                id: g.id,
                name: g.name,
                studentCount: g._count.students,
                groupSalary: g._count.students * rate,
            })),
        };
    }
    async getAllSalaries() {
        const teachers = await this.prisma.teacher.findMany({
            where: { isActive: true },
            include: {
                groups: {
                    where: { isActive: true },
                    include: {
                        _count: { select: { students: { where: { isActive: true } } } },
                    },
                },
            },
        });
        return teachers.map((t) => {
            const studentCount = t.groups.reduce((sum, g) => sum + g._count.students, 0);
            const rate = Number(t.ratePerStudent);
            return {
                teacherId: t.id,
                fullName: t.fullName,
                studentCount,
                ratePerStudent: rate,
                totalSalary: studentCount * rate,
            };
        });
    }
};
exports.SalaryService = SalaryService;
exports.SalaryService = SalaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalaryService);
//# sourceMappingURL=salary.service.js.map