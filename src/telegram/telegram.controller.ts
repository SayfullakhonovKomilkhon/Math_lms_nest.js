import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('telegram')
export class TelegramController {
  constructor(
    private telegramService: TelegramService,
    private prisma: PrismaService,
  ) {}

  @Post('generate-code')
  generateCode(@Request() req) {
    const code = this.telegramService.generateCode(req.user.id);
    return {
      code,
      botUsername: process.env.TELEGRAM_BOT_USERNAME ?? 'mathcenter_bot',
    };
  }

  @Get('status')
  async status(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { telegramChatId: true },
    });
    return { linked: Boolean(user?.telegramChatId) };
  }

  @Post('unlink')
  async unlink(@Request() req) {
    await this.prisma.user.update({
      where: { id: req.user.id },
      data: { telegramChatId: null },
    });
    return { success: true };
  }
}
