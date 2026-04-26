import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

// Group membership and per-group fees are managed through the dedicated
// /students/:id/groups endpoints (see assign-group.dto.ts and
// update-group-fee.dto.ts), so they are excluded from the generic
// "update student profile" payload.
export class UpdateStudentDto extends PartialType(
  OmitType(CreateStudentDto, [
    'phone',
    'password',
    'groupId',
    'monthlyFee',
  ] as const),
) {}
