import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { GroupsModule } from './groups/groups.module';
import { ParentsModule } from './parents/parents.module';
import { AttendanceModule } from './attendance/attendance.module';
import { GradesModule } from './grades/grades.module';
import { HomeworkModule } from './homework/homework.module';
import { LessonTopicsModule } from './lesson-topics/lesson-topics.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SalaryModule } from './salary/salary.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { GamificationModule } from './gamification/gamification.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TelegramModule } from './telegram/telegram.module';
import { HealthModule } from './health/health.module';
import { ApplicationsModule } from './applications/applications.module';
import { DevicesModule } from './devices/devices.module';
import { ContentModule } from './content/content.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      // 10 req/min was a footgun for authenticated UIs (one click = one
      // request — e.g. attendance/grade cells). 300/min still throttles
      // abuse but lets a teacher rapidly mark a class without hitting 429.
      // Endpoints with stricter needs override via @Throttle.
      {
        ttl: 60000,
        limit: 300,
      },
    ]),
    NestScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    GroupsModule,
    ParentsModule,
    AttendanceModule,
    GradesModule,
    HomeworkModule,
    LessonTopicsModule,
    PaymentsModule,
    ExpensesModule,
    SalaryModule,
    ScheduleModule,
    AnnouncementsModule,
    AnalyticsModule,
    ReportsModule,
    SettingsModule,
    GamificationModule,
    NotificationsModule,
    TelegramModule,
    HealthModule,
    ApplicationsModule,
    DevicesModule,
    ContentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
