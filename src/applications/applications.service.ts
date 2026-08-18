import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationActivityType,
  ApplicationStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { CreateManualApplicationDto } from './dto/create-manual-application.dto';

const applicationSourceLabels = {
  WEBSITE: 'Сайт',
  ADVERTISEMENT: 'Объявление / реклама',
  INSTAGRAM: 'Instagram',
  TELEGRAM: 'Telegram',
  PHONE_CALL: 'Входящий звонок',
  WALK_IN: 'Пришёл в учебный центр',
  REFERRAL: 'Рекомендация',
  OTHER: 'Другое',
} as const;

type AuthUser = { id: string; role: Role };
type ApplicationFilters = {
  status?: ApplicationStatus;
  search?: string;
  callback?: 'today' | 'overdue';
};

const applicationInclude = {
  assignedTo: {
    select: { id: true, fullName: true, phone: true, isActive: true },
  },
  activities: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      actor: { select: { id: true, fullName: true, phone: true, role: true } },
    },
  },
} satisfies Prisma.AdmissionApplicationInclude;

function tashkentDayBounds(now = new Date()) {
  const offsetMs = 5 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() + offsetMs);
  shifted.setUTCHours(0, 0, 0, 0);
  const start = new Date(shifted.getTime() - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApplicationDto) {
    const manager = await this.prisma.user.findFirst({
      where: { role: Role.SALES_MANAGER, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.admissionApplication.create({
        data: {
          ...dto,
          assignedToId: manager?.id,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      if (manager) {
        await tx.applicationActivity.create({
          data: {
            applicationId: application.id,
            actorId: manager.id,
            type: ApplicationActivityType.ASSIGNMENT,
            note: 'Новая заявка автоматически назначена менеджеру',
          },
        });
      }

      return application;
    });
  }

  async createManual(dto: CreateManualApplicationDto, user: AuthUser) {
    const { note, ...applicationData } = dto;
    const assignedToId =
      user.role === Role.SALES_MANAGER
        ? user.id
        : (
            await this.prisma.user.findFirst({
              where: { role: Role.SALES_MANAGER, isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            })
          )?.id;

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.admissionApplication.create({
        data: {
          ...applicationData,
          assignedToId,
        },
      });

      const sourceLabel = applicationSourceLabels[dto.source];
      const sourceText = dto.sourceDetails
        ? `${sourceLabel}: ${dto.sourceDetails}`
        : sourceLabel;
      const activityNote = [
        `Лид добавлен вручную. Источник: ${sourceText}`,
        note,
      ]
        .filter(Boolean)
        .join('\n');

      await tx.applicationActivity.create({
        data: {
          applicationId: application.id,
          actorId: user.id,
          type: ApplicationActivityType.ASSIGNMENT,
          note: activityNote,
        },
      });

      return tx.admissionApplication.findUniqueOrThrow({
        where: { id: application.id },
        include: applicationInclude,
      });
    });
  }

  async findAll(user: AuthUser, filters: ApplicationFilters) {
    const where = this.visibleWhere(user);

    if (
      filters.status &&
      Object.values(ApplicationStatus).includes(filters.status)
    ) {
      where.status = filters.status;
    }

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { parentFullName: { contains: search, mode: 'insensitive' } },
        { parentPhone: { contains: search } },
      ];
    }

    if (filters.callback) {
      const { start, end } = tashkentDayBounds();
      where.nextCallAt =
        filters.callback === 'today' ? { gte: start, lt: end } : { lt: start };
    }

    return this.prisma.admissionApplication.findMany({
      where,
      include: {
        assignedTo: applicationInclude.assignedTo,
        _count: { select: { activities: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getSummary(user: AuthUser) {
    const visible = this.visibleWhere(user);
    const { start, end } = tashkentDayBounds();
    const openStatuses: ApplicationStatus[] = [
      ApplicationStatus.NEW,
      ApplicationStatus.IN_PROGRESS,
      ApplicationStatus.NO_ANSWER,
      ApplicationStatus.INTERESTED,
      ApplicationStatus.TRIAL_SCHEDULED,
    ];

    const [total, fresh, active, callbacksToday, overdue, trials, enrolled] =
      await this.prisma.$transaction([
        this.prisma.admissionApplication.count({ where: visible }),
        this.prisma.admissionApplication.count({
          where: { ...visible, status: ApplicationStatus.NEW },
        }),
        this.prisma.admissionApplication.count({
          where: { ...visible, status: { in: openStatuses } },
        }),
        this.prisma.admissionApplication.count({
          where: {
            ...visible,
            status: { in: openStatuses },
            nextCallAt: { gte: start, lt: end },
          },
        }),
        this.prisma.admissionApplication.count({
          where: {
            ...visible,
            status: { in: openStatuses },
            nextCallAt: { lt: start },
          },
        }),
        this.prisma.admissionApplication.count({
          where: { ...visible, status: ApplicationStatus.TRIAL_SCHEDULED },
        }),
        this.prisma.admissionApplication.count({
          where: { ...visible, status: ApplicationStatus.ENROLLED },
        }),
      ]);

    return {
      total,
      new: fresh,
      active,
      callbacksToday,
      overdue,
      trials,
      enrolled,
    };
  }

  async findOne(id: string, user: AuthUser) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { id },
      include: applicationInclude,
    });
    if (!application) throw new NotFoundException('Application not found');
    this.assertVisible(application.assignedToId, user);
    return application;
  }

  async update(id: string, dto: UpdateApplicationDto, user: AuthUser) {
    const current = await this.prisma.admissionApplication.findUnique({
      where: { id },
      select: { id: true, status: true, assignedToId: true },
    });
    if (!current) throw new NotFoundException('Application not found');
    this.assertVisible(current.assignedToId, user);

    const note = dto.note?.trim() || undefined;
    const statusChanged =
      dto.status !== undefined && dto.status !== current.status;
    const terminalStatus =
      dto.status === ApplicationStatus.ENROLLED ||
      dto.status === ApplicationStatus.REJECTED;
    const callbackChanged = dto.nextCallAt !== undefined || terminalStatus;
    const nextCallAt = terminalStatus
      ? null
      : dto.nextCallAt
        ? new Date(dto.nextCallAt)
        : null;

    return this.prisma.$transaction(async (tx) => {
      await tx.admissionApplication.update({
        where: { id },
        data: {
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(callbackChanged ? { nextCallAt } : {}),
          ...(statusChanged ? { lastContactAt: new Date() } : {}),
        },
      });

      if (statusChanged || callbackChanged || note) {
        await tx.applicationActivity.create({
          data: {
            applicationId: id,
            actorId: user.id,
            type: statusChanged
              ? ApplicationActivityType.STATUS_CHANGE
              : callbackChanged
                ? ApplicationActivityType.CALLBACK
                : ApplicationActivityType.COMMENT,
            note,
            fromStatus: statusChanged ? current.status : undefined,
            toStatus: statusChanged ? dto.status : undefined,
            nextCallAt: callbackChanged ? nextCallAt : undefined,
          },
        });
      }

      return tx.admissionApplication.findUniqueOrThrow({
        where: { id },
        include: applicationInclude,
      });
    });
  }

  private visibleWhere(user: AuthUser): Prisma.AdmissionApplicationWhereInput {
    return user.role === Role.SALES_MANAGER ? { assignedToId: user.id } : {};
  }

  private assertVisible(assignedToId: string | null, user: AuthUser) {
    if (user.role === Role.SALES_MANAGER && assignedToId !== user.id) {
      throw new ForbiddenException(
        'This application is assigned to another user',
      );
    }
  }
}
