import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(
  OmitType(CreateStudentDto, ['email', 'password'] as const),
) {}
