import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GamificationService } from './gamification.service';
import { GamificationProcessor } from './gamification.processor';
import { GamificationController } from './gamification.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'gamification' })],
  providers: [GamificationService, GamificationProcessor],
  controllers: [GamificationController],
  exports: [GamificationService],
})
export class GamificationModule {}
