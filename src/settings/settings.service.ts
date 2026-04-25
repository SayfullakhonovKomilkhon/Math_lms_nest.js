import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const DEFAULT_SETTINGS: { key: string; value: string; label: string }[] = [
  { key: 'center_name', value: 'MathCenter', label: 'Название центра' },
  { key: 'centerName', value: 'MathCenter', label: 'Название центра (legacy)' },
  { key: 'centerPhone', value: '', label: 'Телефон центра' },
  { key: 'centerAddress', value: '', label: 'Адрес центра' },
  { key: 'currency', value: 'UZS', label: 'Валюта' },
  { key: 'monthlyFeeDefault', value: '0', label: 'Ежемес. взнос по умолчанию' },
  {
    key: 'default_rate_per_student',
    value: '50000',
    label: 'Ставка за ученика по умолчанию (сум)',
  },
  { key: 'timezone', value: 'Asia/Tashkent', label: 'Часовой пояс' },
  {
    key: 'workingDays',
    value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
    label: 'Рабочие дни',
  },
  {
    key: 'academic_year_start',
    value: '09-01',
    label: 'Начало учебного года (MM-DD)',
  },
  {
    key: 'payment_reminder_days_1',
    value: '1',
    label: 'Напомин. об оплате: 1-й день месяца',
  },
  {
    key: 'payment_reminder_days_2',
    value: '10',
    label: 'Напомин. об оплате: 2-й день месяца',
  },
  {
    key: 'payment_reminder_days_3',
    value: '20',
    label: 'Напомин. об оплате: 3-й день месяца',
  },
];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Ensure defaults exist
    for (const def of DEFAULT_SETTINGS) {
      await this.prisma.setting.upsert({
        where: { key: def.key },
        create: def,
        update: {},
      });
    }

    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  // Subset of settings that are safe to expose to any authenticated user.
  // Used by frontend layouts (sidebar, login screen) to render the actual
  // center branding instead of a hardcoded "MathCenter".
  async getPublicBranding() {
    const PUBLIC_KEYS = ['center_name', 'centerName', 'centerPhone', 'centerAddress'];
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
      select: { key: true, value: true },
    });

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      centerName: map['center_name'] || map['centerName'] || 'MathCenter',
      centerPhone: map['centerPhone'] ?? '',
      centerAddress: map['centerAddress'] ?? '',
    };
  }

  async getValue(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return row?.value ?? null;
  }

  async updateMany(dto: UpdateSettingsDto, actorId: string) {
    const results = await this.prisma.$transaction(
      dto.settings.map((s) =>
        this.prisma.setting.upsert({
          where: { key: s.key },
          create: { key: s.key, value: s.value, updatedBy: actorId },
          update: { value: s.value, updatedBy: actorId },
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE_SETTINGS',
        entity: 'Setting',
        details: dto.settings as unknown as Prisma.InputJsonValue,
      },
    });

    return results;
  }
}
