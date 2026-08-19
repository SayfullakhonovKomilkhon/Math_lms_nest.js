import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { ExpoPushService } from './expo-push.service';
import { BullModule } from '@nestjs/bullmq';
import { PushReceiptProcessor } from './push-receipt.processor';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'push-receipts' })],
  controllers: [DevicesController],
  providers: [DevicesService, ExpoPushService, PushReceiptProcessor],
  exports: [ExpoPushService],
})
export class DevicesModule {}
