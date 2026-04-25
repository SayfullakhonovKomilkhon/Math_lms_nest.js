import { Module } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { PaymentsModule } from '../payments/payments.module';
import { GradesModule } from '../grades/grades.module';

@Module({
  imports: [PaymentsModule, GradesModule],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
