import { Module } from '@nestjs/common';
import { S3Service } from '../common/services/s3.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, S3Service],
  exports: [ExpensesService],
})
export class ExpensesModule {}
