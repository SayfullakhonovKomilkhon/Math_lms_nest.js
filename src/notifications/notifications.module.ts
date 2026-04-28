import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { LessonReminderProcessor } from './lesson-reminder.processor';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    PrismaModule,
    TelegramModule,
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    LessonReminderProcessor,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
