import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { S3Service } from '../common/services/s3.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, S3Service],
  exports: [PaymentsService],
})
export class PaymentsModule {}
