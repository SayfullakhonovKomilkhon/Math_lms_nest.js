import { ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryGradesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ enum: LessonType })
  @IsOptional()
  @IsEnum(LessonType)
  lessonType?: LessonType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class RatingQueryDto {
  @ApiPropertyOptional({ enum: ['month', 'quarter', 'all'], default: 'month' })
  @IsOptional()
  @IsString()
  period?: 'month' | 'quarter' | 'all';
}
