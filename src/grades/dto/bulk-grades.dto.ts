import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class GradeRecordDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiPropertyOptional({ description: 'null if student was absent / clear grade' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  score?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class BulkGradesDto {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ['PRACTICE', 'CONTROL', 'TEST'] })
  @IsIn(['PRACTICE', 'CONTROL', 'TEST'])
  lessonType: 'PRACTICE' | 'CONTROL' | 'TEST';

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  maxScore: number;

  @ApiProperty({ type: [GradeRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeRecordDto)
  records: GradeRecordDto[];
}
