import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterPushTokenDto) {
    if (!this.isExpoPushToken(dto.token)) {
      throw new BadRequestException('Invalid Expo push token');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.devicePushToken.deleteMany({
        where: {
          userId,
          deviceId: dto.deviceId,
          token: { not: dto.token },
        },
      });

      return tx.devicePushToken.upsert({
        where: { token: dto.token },
        create: {
          userId,
          token: dto.token,
          deviceId: dto.deviceId,
          platform: dto.platform,
          appVersion: dto.appVersion,
          isActive: true,
          lastSeenAt: new Date(),
        },
        update: {
          userId,
          deviceId: dto.deviceId,
          platform: dto.platform,
          appVersion: dto.appVersion,
          isActive: true,
          lastSeenAt: new Date(),
        },
        select: {
          id: true,
          deviceId: true,
          platform: true,
          isActive: true,
          lastSeenAt: true,
        },
      });
    });
  }

  async unregister(userId: string, deviceId: string) {
    await this.prisma.devicePushToken.deleteMany({
      where: { userId, deviceId },
    });
    return { success: true };
  }

  async getMine(userId: string) {
    return this.prisma.devicePushToken.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        platform: true,
        appVersion: true,
        isActive: true,
        lastSeenAt: true,
      },
    });
  }

  private isExpoPushToken(token: string) {
    return /^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/.test(token);
  }
}
