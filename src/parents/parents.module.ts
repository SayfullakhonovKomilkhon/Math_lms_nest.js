import { Module } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
