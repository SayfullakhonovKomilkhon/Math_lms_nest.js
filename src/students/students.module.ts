import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { S3Service } from '../common/services/s3.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, S3Service],
  exports: [StudentsService],
})
export class StudentsModule {}
