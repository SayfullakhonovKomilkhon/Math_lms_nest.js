import { BadRequestException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DevicesService', () => {
  const tx = {
    devicePushToken: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const prismaMock = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    devicePushToken: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const service = new DevicesService(prismaMock as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a malformed Expo token', async () => {
    await expect(
      service.register('user-1', {
        token: 'not-a-push-token',
        deviceId: 'ios-1',
        platform: 'ios',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces an old token for the same device and activates the new token', async () => {
    const saved = {
      id: 'token-row',
      deviceId: 'ios-1',
      platform: 'ios',
      isActive: true,
      lastSeenAt: new Date(),
    };
    tx.devicePushToken.upsert.mockResolvedValue(saved);

    await expect(
      service.register('user-1', {
        token: 'ExponentPushToken[valid-token-123]',
        deviceId: 'ios-1',
        platform: 'ios',
        appVersion: '1.0.0',
      }),
    ).resolves.toEqual(saved);

    expect(tx.devicePushToken.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deviceId: 'ios-1',
        token: { not: 'ExponentPushToken[valid-token-123]' },
      },
    });
    expect(tx.devicePushToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'ExponentPushToken[valid-token-123]' },
        // Jest asymmetric matchers are typed as `any` by @types/jest.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        update: expect.objectContaining({ userId: 'user-1', isActive: true }),
      }),
    );
  });

  it('unregisters only the current user device', async () => {
    await service.unregister('user-1', 'ios-1');
    expect(prismaMock.devicePushToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', deviceId: 'ios-1' },
    });
  });
});
