import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DevicesModule } from '../devices/devices.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
@Module({
  imports: [PrismaModule, DevicesModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
