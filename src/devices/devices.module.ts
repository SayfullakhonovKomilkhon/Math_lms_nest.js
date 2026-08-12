import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { ExpoPushService } from './expo-push.service';

@Module({
  imports: [PrismaModule],
  controllers: [DevicesController],
  providers: [DevicesService, ExpoPushService],
  exports: [ExpoPushService],
})
export class DevicesModule {}
