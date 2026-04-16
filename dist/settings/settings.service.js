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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const DEFAULT_SETTINGS = [
    { key: 'center_name', value: 'MathCenter', label: 'Название центра' },
    { key: 'centerName', value: 'MathCenter', label: 'Название центра (legacy)' },
    { key: 'centerPhone', value: '', label: 'Телефон центра' },
    { key: 'centerAddress', value: '', label: 'Адрес центра' },
    { key: 'currency', value: 'UZS', label: 'Валюта' },
    { key: 'monthlyFeeDefault', value: '0', label: 'Ежемес. взнос по умолчанию' },
    { key: 'default_rate_per_student', value: '50000', label: 'Ставка за ученика по умолчанию (сум)' },
    { key: 'timezone', value: 'Asia/Tashkent', label: 'Часовой пояс' },
    { key: 'workingDays', value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY', label: 'Рабочие дни' },
    { key: 'academic_year_start', value: '09-01', label: 'Начало учебного года (MM-DD)' },
    { key: 'payment_reminder_days_1', value: '1', label: 'Напомин. об оплате: 1-й день месяца' },
    { key: 'payment_reminder_days_2', value: '10', label: 'Напомин. об оплате: 2-й день месяца' },
    { key: 'payment_reminder_days_3', value: '20', label: 'Напомин. об оплате: 3-й день месяца' },
];
let SettingsService = class SettingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        for (const def of DEFAULT_SETTINGS) {
            await this.prisma.setting.upsert({
                where: { key: def.key },
                create: def,
                update: {},
            });
        }
        return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    }
    async updateMany(dto, actorId) {
        const results = await this.prisma.$transaction(dto.settings.map((s) => this.prisma.setting.upsert({
            where: { key: s.key },
            create: { key: s.key, value: s.value, updatedBy: actorId },
            update: { value: s.value, updatedBy: actorId },
        })));
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE_SETTINGS',
                entity: 'Setting',
                details: dto.settings,
            },
        });
        return results;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map