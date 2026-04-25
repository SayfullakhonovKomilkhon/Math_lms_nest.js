import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TelegramService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  // In-memory map for link codes: code → { chatId, expiresAt }
  private pendingCodes = new Map<
    string,
    { chatId: string; expiresAt: number }
  >();

  constructor(private prisma: PrismaService) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
      return;
    }
    this.bot = new Telegraf(token);
    this.setupCommands();
    this.bot.launch().catch((err) => {
      this.logger.error('Failed to launch Telegram bot', err);
    });
    this.logger.log('Telegram bot started');
  }

  private setupCommands() {
    if (!this.bot) return;

    this.bot.start(async (ctx) => {
      const chatId = String(ctx.chat.id);
      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (user) {
        await ctx.reply(
          `✅ Ваш аккаунт уже привязан!\n\nДоступные команды:\n/pay — статус оплаты\n/homework — последнее ДЗ`,
        );
      } else {
        await ctx.reply(
          `👋 Добро пожаловать в MathCenter Bot!\n\nДля привязки аккаунта:\n1. Войдите в систему на сайте\n2. Перейдите в настройки профиля\n3. Нажмите "Привязать Telegram"\n4. Введите полученный код здесь: /link <КОД>`,
        );
      }
    });

    this.bot.command('link', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const parts = ctx.message.text.split(' ');
      const code = parts[1];

      if (!code) {
        await ctx.reply('Укажите код: /link 123456');
        return;
      }

      const pending = this.pendingCodes.get(code);
      if (!pending || Date.now() > pending.expiresAt) {
        await ctx.reply(
          '❌ Неверный или устаревший код. Получите новый код в приложении.',
        );
        this.pendingCodes.delete(code);
        return;
      }

      // Store chatId associated with code for the app to retrieve
      pending.chatId = chatId;
      this.pendingCodes.set(code, pending);
      await ctx.reply(
        '✅ Код подтверждён! Вернитесь в приложение для завершения привязки.',
      );
    });

    this.bot.command('pay', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId },
        include: {
          student: {
            include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
          },
        },
      });

      if (!user || !user.student) {
        await ctx.reply(
          '❌ Аккаунт не привязан. Используйте /start для инструкций.',
        );
        return;
      }

      const lastPayment = user.student.payments[0];
      const fee = Number(user.student.monthlyFee);
      if (!lastPayment) {
        await ctx.reply(
          `💳 Ежемесячная оплата: ${fee.toLocaleString('ru-RU')} сум\nСтатус: не оплачено`,
        );
      } else {
        const statusMap: Record<string, string> = {
          PENDING: '⏳ На проверке',
          CONFIRMED: '✅ Оплачено',
          REJECTED: '❌ Отклонено',
        };
        await ctx.reply(
          `💳 Ежемесячная оплата: ${fee.toLocaleString('ru-RU')} сум\nСтатус: ${statusMap[lastPayment.status] ?? lastPayment.status}`,
        );
      }
    });

    this.bot.command('homework', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId },
        include: { student: true },
      });

      if (!user?.student?.groupId) {
        await ctx.reply('❌ Аккаунт не привязан или нет группы.');
        return;
      }

      const hw = await this.prisma.homework.findFirst({
        where: { groupId: user.student.groupId },
        orderBy: { createdAt: 'desc' },
        include: { teacher: { select: { fullName: true } } },
      });

      if (!hw) {
        await ctx.reply('📚 Нет домашних заданий.');
      } else {
        const due = hw.dueDate
          ? `\nСрок: ${hw.dueDate.toLocaleDateString('ru-RU')}`
          : '';
        await ctx.reply(
          `📚 Последнее ДЗ от ${hw.teacher.fullName}:\n\n${hw.text}${due}`,
        );
      }
    });
  }

  generateCode(): string {
    const code = crypto.randomInt(100000, 999999).toString();
    // expires in 10 minutes
    this.pendingCodes.set(code, {
      chatId: '',
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return code;
  }

  getChatIdForCode(code: string): string | null {
    const pending = this.pendingCodes.get(code);
    if (!pending || Date.now() > pending.expiresAt) {
      this.pendingCodes.delete(code);
      return null;
    }
    return pending.chatId || null;
  }

  consumeCode(code: string): void {
    this.pendingCodes.delete(code);
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      this.logger.error(`Failed to send Telegram message to ${chatId}`, err);
    }
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }
}
