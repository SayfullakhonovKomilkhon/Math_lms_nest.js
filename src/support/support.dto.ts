import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LessonUnderstanding, SupportOutcome } from '@prisma/client';

export class FeedbackDto {
  @IsString() @IsNotEmpty() groupId: string;
  @IsString() @IsNotEmpty() studentId: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) date: string;
  @IsString() @IsNotEmpty() @MaxLength(300) topic: string;
  @IsEnum(LessonUnderstanding) understanding: LessonUnderstanding;
  @IsString() @MaxLength(2000) comment: string;
  @IsString() @MaxLength(2000) privateNote: string;
}
export class AvailabilityWindowDto {
  @IsInt() @Min(0) @Max(6) weekday: number;
  @IsInt() @Min(0) @Max(1439) startMinute: number;
  @IsInt() @Min(1) @Max(1440) endMinute: number;
  @IsInt() @Min(15) @Max(180) duration: number;
  @IsInt() @Min(2) @Max(30) capacity: number;
  @IsString() @IsNotEmpty() @MaxLength(300) location: string;
}
export class AvailabilityDto {
  @IsArray()
  @ArrayMaxSize(28)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowDto)
  windows: AvailabilityWindowDto[];
}
export class TimeOffDto {
  @IsDateString({ strict: true }) startAt: string;
  @IsDateString({ strict: true }) endAt: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}
export class BookingDto {
  @IsString() @IsNotEmpty() feedbackId: string;
  @IsString() @IsNotEmpty() teacherId: string;
  @IsDateString({ strict: true }) startAt: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) task: string;
}
export class ReasonDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}
export class MoveDto extends ReasonDto {
  @IsString() @IsNotEmpty() teacherId: string;
  @IsDateString({ strict: true }) startAt: string;
}
export class ResultDto {
  @IsEnum({ COMPLETED: 'COMPLETED', NO_SHOW: 'NO_SHOW' }) status:
    | 'COMPLETED'
    | 'NO_SHOW';
  @IsEnum(SupportOutcome) outcome: SupportOutcome;
  @IsString() @IsNotEmpty() @MaxLength(2000) result: string;
}
