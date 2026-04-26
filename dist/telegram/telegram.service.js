"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const telegraf_1 = require("telegraf");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let TelegramService = TelegramService_1 = class TelegramService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TelegramService_1.name);
        this.bot = null;
        this.pendingCodes = new Map();
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
            return;
        }
        this.bot = new telegraf_1.Telegraf(token);
        this.setupCommands();
        this.bot.launch().catch((err) => {
            this.logger.error('Failed to launch Telegram bot', err);
        });
        this.logger.log('Telegram bot started');
    }
    setupCommands() {
        if (!this.bot)
            return;
        this.bot.start(async (ctx) => {
            const chatId = String(ctx.chat.id);
            const user = await this.prisma.user.findFirst({
                where: { telegramChatId: chatId },
            });
            if (user) {
                await ctx.reply(`✅ Ваш аккаунт уже привязан!\n\nДоступные команды:\n/pay — статус оплаты\n/homework — последнее ДЗ`);
            }
            else {
                await ctx.reply(`👋 Добро пожаловать в MathCenter Bot!\n\nДля привязки аккаунта:\n1. Войдите в систему на сайте\n2. Перейдите в настройки профиля\n3. Нажмите "Привязать Telegram"\n4. Введите полученный код здесь: /link <КОД>`);
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
                await ctx.reply('❌ Неверный или устаревший код. Получите новый код в приложении.');
                this.pendingCodes.delete(code);
                return;
            }
            pending.chatId = chatId;
            this.pendingCodes.set(code, pending);
            await ctx.reply('✅ Код подтверждён! Вернитесь в приложение для завершения привязки.');
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
                await ctx.reply('❌ Аккаунт не привязан. Используйте /start для инструкций.');
                return;
            }
            const lastPayment = user.student.payments[0];
            const fee = user.student.groups.reduce((acc, link) => acc + Number(link.monthlyFee), 0);
            if (!lastPayment) {
                await ctx.reply(`💳 Ежемесячная оплата: ${fee.toLocaleString('ru-RU')} сум\nСтатус: не оплачено`);
            }
            else {
                const statusMap = {
                    PENDING: '⏳ На проверке',
                    CONFIRMED: '✅ Оплачено',
                    REJECTED: '❌ Отклонено',
                };
                await ctx.reply(`💳 Ежемесячная оплата: ${fee.toLocaleString('ru-RU')} сум\nСтатус: ${statusMap[lastPayment.status] ?? lastPayment.status}`);
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
            }
            else {
                const due = hw.dueDate
                    ? `\nСрок: ${hw.dueDate.toLocaleDateString('ru-RU')}`
                    : '';
                await ctx.reply(`📚 Последнее ДЗ от ${hw.teacher.fullName}:\n\n${hw.text}${due}`);
            }
        });
    }
    generateCode() {
        const code = crypto.randomInt(100000, 999999).toString();
        this.pendingCodes.set(code, {
            chatId: '',
            expiresAt: Date.now() + 10 * 60 * 1000,
        });
        return code;
    }
    getChatIdForCode(code) {
        const pending = this.pendingCodes.get(code);
        if (!pending || Date.now() > pending.expiresAt) {
            this.pendingCodes.delete(code);
            return null;
        }
        return pending.chatId || null;
    }
    consumeCode(code) {
        this.pendingCodes.delete(code);
    }
    async sendMessage(chatId, message) {
        if (!this.bot)
            return;
        try {
            await this.bot.telegram.sendMessage(chatId, message, {
                parse_mode: 'HTML',
            });
        }
        catch (err) {
            this.logger.error(`Failed to send Telegram message to ${chatId}`, err);
        }
    }
    onModuleDestroy() {
        this.bot?.stop('SIGTERM');
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map