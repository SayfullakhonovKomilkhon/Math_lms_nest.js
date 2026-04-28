"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const notifications_service_1 = require("./notifications.service");
const notifications_processor_1 = require("./notifications.processor");
const lesson_reminder_processor_1 = require("./lesson-reminder.processor");
const notifications_controller_1 = require("./notifications.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const telegram_module_1 = require("../telegram/telegram.module");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            telegram_module_1.TelegramModule,
            bullmq_1.BullModule.registerQueue({ name: 'notifications' }),
        ],
        providers: [
            notifications_service_1.NotificationsService,
            notifications_processor_1.NotificationsProcessor,
            lesson_reminder_processor_1.LessonReminderProcessor,
        ],
        controllers: [notifications_controller_1.NotificationsController],
        exports: [notifications_service_1.NotificationsService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map