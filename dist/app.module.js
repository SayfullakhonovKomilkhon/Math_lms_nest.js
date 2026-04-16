"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const core_1 = require("@nestjs/core");
const configuration_1 = __importDefault(require("./config/configuration"));
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const students_module_1 = require("./students/students.module");
const teachers_module_1 = require("./teachers/teachers.module");
const groups_module_1 = require("./groups/groups.module");
const parents_module_1 = require("./parents/parents.module");
const attendance_module_1 = require("./attendance/attendance.module");
const grades_module_1 = require("./grades/grades.module");
const homework_module_1 = require("./homework/homework.module");
const lesson_topics_module_1 = require("./lesson-topics/lesson-topics.module");
const payments_module_1 = require("./payments/payments.module");
const salary_module_1 = require("./salary/salary.module");
const schedule_module_1 = require("./schedule/schedule.module");
const announcements_module_1 = require("./announcements/announcements.module");
const analytics_module_1 = require("./analytics/analytics.module");
const reports_module_1 = require("./reports/reports.module");
const settings_module_1 = require("./settings/settings.module");
const gamification_module_1 = require("./gamification/gamification.module");
const notifications_module_1 = require("./notifications/notifications.module");
const telegram_module_1 = require("./telegram/telegram.module");
const health_module_1 = require("./health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 10,
                },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                },
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            students_module_1.StudentsModule,
            teachers_module_1.TeachersModule,
            groups_module_1.GroupsModule,
            parents_module_1.ParentsModule,
            attendance_module_1.AttendanceModule,
            grades_module_1.GradesModule,
            homework_module_1.HomeworkModule,
            lesson_topics_module_1.LessonTopicsModule,
            payments_module_1.PaymentsModule,
            salary_module_1.SalaryModule,
            schedule_module_1.ScheduleModule,
            announcements_module_1.AnnouncementsModule,
            analytics_module_1.AnalyticsModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
            gamification_module_1.GamificationModule,
            notifications_module_1.NotificationsModule,
            telegram_module_1.TelegramModule,
            health_module_1.HealthModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map