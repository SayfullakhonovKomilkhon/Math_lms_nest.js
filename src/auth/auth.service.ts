import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        telegramChatId: user.telegramChatId,
      },
    };
  }

  private readonly refreshInFlight = new Map<
    string,
    Promise<{ accessToken: string; refreshToken: string }>
  >();

  async refresh(userId: string, refreshToken: string) {
    const existing = this.refreshInFlight.get(refreshToken);
    if (existing) return existing;
    const pending = this.rotateRefresh(userId, refreshToken);
    this.refreshInFlight.set(refreshToken, pending);
    try {
      return await pending;
    } finally {
      this.refreshInFlight.delete(refreshToken);
    }
  }

  private async rotateRefresh(userId: string, refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        algorithms: ['HS256'],
      });
      if (payload.sub !== userId) throw new Error('Invalid subject');
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    // Atomic consumption prevents double deletion and rolls back if insertion fails.
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.deleteMany({
        where: { token: refreshToken, userId },
      });
      if (consumed.count !== 1)
        throw new UnauthorizedException('Refresh token already used');
      const payload = this.jwtService.decode(tokens.refreshToken) as {
        exp: number;
      };
      await tx.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId,
          expiresAt: new Date(payload.exp * 1000),
        },
      });
    });

    return tokens;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        telegramChatId: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found or inactive');
    }

    const wantsPhoneChange = !!dto.phone && dto.phone !== user.phone;
    const wantsPasswordChange = !!dto.newPassword;

    if (!wantsPhoneChange && !wantsPasswordChange) {
      throw new BadRequestException('Nothing to update');
    }

    if (!dto.currentPassword) {
      throw new BadRequestException('Current password is required');
    }
    const passwordOk = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!passwordOk) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (wantsPhoneChange) {
      const clash = await this.prisma.user.findUnique({
        where: { phone: dto.phone! },
      });
      if (clash && clash.id !== user.id) {
        throw new ConflictException('Phone is already in use');
      }
    }

    const data: { phone?: string; passwordHash?: string } = {};
    if (wantsPhoneChange) data.phone = dto.phone!;
    if (wantsPasswordChange) {
      data.passwordHash = await bcrypt.hash(dto.newPassword!, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        telegramChatId: true,
      },
    });

    // Keep the parent's contact phone aligned with their login phone.
    if (wantsPhoneChange && updated.role === 'PARENT') {
      await this.prisma.parent.updateMany({
        where: { userId },
        data: { phone: updated.phone },
      });
    }

    // Rotate refresh tokens (invalidate all other sessions, issue a fresh pair
    // for the current session so the caller can keep working seamlessly).
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    const tokens = await this.generateTokens(
      updated.id,
      updated.phone,
      updated.role,
    );
    await this.saveRefreshToken(updated.id, tokens.refreshToken);

    return {
      user: updated,
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken, userId },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const accessExpiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '30d';

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      jwtid: randomUUID(),
      expiresIn: refreshExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const payload = this.jwtService.decode(token) as { exp: number };
    const expiresAt = new Date(payload.exp * 1000);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }
}
