import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class LinkDto {
  @IsString()
  @Length(6, 6)
  linkCode: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.PARENT, Role.TEACHER)
@Controller('telegram')
export class TelegramController {
  constructor(
    private telegramService: TelegramService,
    private prisma: PrismaService,
  ) {}

  @Post('generate-code')
  generateCode() {
    const code = this.telegramService.generateCode();
    return {
      code,
      botUsername: process.env.TELEGRAM_BOT_USERNAME ?? 'mathcenter_bot',
    };
  }

  @Post('link')
  async link(@Body() dto: LinkDto, @Request() req) {
    const chatId = this.telegramService.getChatIdForCode(dto.linkCode);
    if (!chatId) {
      throw new BadRequestException('Invalid or expired link code');
    }

    await this.prisma.user.update({
      where: { id: req.user.id },
      data: { telegramChatId: chatId },
    });

    this.telegramService.consumeCode(dto.linkCode);
    return { success: true };
  }
}
