import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateLessonTopicDto {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Квадратные уравнения — метод дискриминанта' })
  @IsString()
  @MinLength(3)
  topic: string;

  @ApiPropertyOptional({ example: { links: [], notes: '' } })
  @IsOptional()
  @IsObject()
  materials?: Record<string, unknown>;
}
