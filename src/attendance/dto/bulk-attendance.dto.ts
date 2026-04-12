import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus, LessonType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AttendanceRecordDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

export class BulkAttendanceDto {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: LessonType })
  @IsEnum(LessonType)
  lessonType: LessonType;

  @ApiProperty({ type: [AttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
