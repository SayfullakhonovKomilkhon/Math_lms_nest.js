import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

interface PendingCode {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class TelegramService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  // code → { userId, expiresAt } — userId is captured at code-generation time,
  // so when the bot receives the code (via deep-link or /link) we can write the
  // chatId directly to user.telegramChatId without a second LMS round-trip.
  private pendingCodes = new Map<string, PendingCode>();
  private readonly CODE_TTL_MS = 10 * 60 * 1000;

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
      // Telegraf populates ctx.startPayload from the `?start=...` deep-link
      // parameter — empty string when user opened bot manually.
      const payload = (ctx as unknown as { startPayload?: string }).startPayload;
      if (payload) {
        const linked = await this.tryLinkByCode(payload, chatId);
        if (linked === 'ok') {
          await ctx.reply(
            '✅ Аккаунт привязан! Теперь вы будете получать уведомления здесь.',
          );
          return;
        }
        if (linked === 'expired') {
          await ctx.reply(
            '❌ Код привязки устарел. Сгенерируйте новый в личном кабинете.',
          );
          return;
        }
        // 'unknown' → fall through to default greeting
      }

      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (user) {
        await ctx.reply(
          '✅ Ваш аккаунт уже привязан!\n\nДоступные команды:\n/pay — статус оплаты\n/homework — последнее ДЗ',
        );
      } else {
        await ctx.reply(
          '👋 Добро пожаловать в MathCenter Bot!\n\nЧтобы получать уведомления, откройте Личный кабинет → Настройки → Telegram и нажмите «Подключить».',
        );
      }
    });

    this.bot.command('link', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const parts = ctx.message.text.split(/\s+/);
      const code = parts[1];

      if (!code) {
        await ctx.reply('Укажите код: /link 123456');
        return;
      }

      const result = await this.tryLinkByCode(code, chatId);
      if (result === 'ok') {
        await ctx.reply(
          '✅ Аккаунт привязан! Теперь вы будете получать уведомления здесь.',
        );
      } else {
        await ctx.reply(
          '❌ Неверный или устаревший код. Получите новый в личном кабинете.',
        );
      }
    });

    this.bot.command('pay', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId },
        include: {
          student: {
            include: {
              payments: { orderBy: { createdAt: 'desc' }, take: 1 },
              groups: { select: { monthlyFee: true } },
            },
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
      const fee = user.student.groups.reduce(
        (acc, link) => acc + Number(link.monthlyFee),
        0,
      );
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
        include: {
          student: {
            include: { groups: { select: { groupId: true } } },
          },
        },
      });

      const groupIds = user?.student?.groups.map((g) => g.groupId) ?? [];
      if (!user?.student || groupIds.length === 0) {
        await ctx.reply('❌ Аккаунт не привязан или нет группы.');
        return;
      }

      const hw = await this.prisma.homework.findFirst({
        where: { groupId: { in: groupIds } },
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

  /**
   * Attempts to link the given Telegram chatId to the user identified by `code`.
   * Returns:
   *  - 'ok'      — link succeeded (or chatId was already this user's value)
   *  - 'expired' — code exists but TTL elapsed
   *  - 'unknown' — code not found
   */
  private async tryLinkByCode(
    code: string,
    chatId: string,
  ): Promise<'ok' | 'expired' | 'unknown'> {
    const pending = this.pendingCodes.get(code);
    if (!pending) return 'unknown';
    if (Date.now() > pending.expiresAt) {
      this.pendingCodes.delete(code);
      return 'expired';
    }

    try {
      await this.prisma.user.update({
        where: { id: pending.userId },
        data: { telegramChatId: chatId },
      });
      this.pendingCodes.delete(code);
      return 'ok';
    } catch (err) {
      this.logger.error(
        `Failed to persist telegramChatId for user=${pending.userId}`,
        err,
      );
      return 'unknown';
    }
  }

  generateCode(userId: string): string {
    // Invalidate any previous code from the same user — keeps the map small
    // and avoids confusion if the user clicks "Сгенерировать" twice.
    for (const [code, p] of this.pendingCodes) {
      if (p.userId === userId) this.pendingCodes.delete(code);
    }
    const code = crypto.randomInt(100000, 999999).toString();
    this.pendingCodes.set(code, {
      userId,
      expiresAt: Date.now() + this.CODE_TTL_MS,
    });
    return code;
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
