import { ApplicationSource, Role } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ApplicationsService', () => {
  it('assigns a manually created lead to the current sales manager', async () => {
    const created = {
      id: 'lead-1',
      fullName: 'Алишер Каримов',
      phone: '+998901234567',
      childAge: 14,
      source: ApplicationSource.ADVERTISEMENT,
      sourceDetails: 'Instagram SAT',
      parentFullName: 'Малика Каримова',
      parentPhone: '+998901234568',
      assignedToId: 'manager-1',
    };
    const transaction = {
      admissionApplication: {
        create: jest.fn().mockResolvedValue(created),
        findUniqueOrThrow: jest.fn().mockResolvedValue(created),
      },
      applicationActivity: { create: jest.fn().mockResolvedValue({}) },
    };
    const findFirst = jest.fn();
    const prisma = {
      user: { findFirst },
      $transaction: jest.fn((callback) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new ApplicationsService(prisma);

    const result = await service.createManual(
      {
        fullName: 'Алишер Каримов',
        phone: '+998901234567',
        childAge: 14,
        source: ApplicationSource.ADVERTISEMENT,
        sourceDetails: 'Instagram SAT',
        parentFullName: 'Малика Каримова',
        parentPhone: '+998901234568',
        note: 'Хочет подготовиться к поступлению',
      },
      { id: 'manager-1', role: Role.SALES_MANAGER },
    );

    expect(result).toBe(created);
    expect(transaction.admissionApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignedToId: 'manager-1',
        source: ApplicationSource.ADVERTISEMENT,
        parentFullName: 'Малика Каримова',
        parentPhone: '+998901234568',
      }),
    });
    expect(transaction.applicationActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: 'lead-1',
        actorId: 'manager-1',
        note: expect.stringContaining(
          'Источник: Объявление / реклама: Instagram SAT',
        ),
      }),
    });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
