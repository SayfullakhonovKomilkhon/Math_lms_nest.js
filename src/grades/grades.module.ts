import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
