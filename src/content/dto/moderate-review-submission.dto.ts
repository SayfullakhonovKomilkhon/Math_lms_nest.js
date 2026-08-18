import { IsIn } from 'class-validator';

export class ModerateReviewSubmissionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}
