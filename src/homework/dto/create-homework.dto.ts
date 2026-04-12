import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateHomeworkDto {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty({ example: 'Решить задачи 1-10 из учебника' })
  @IsString()
  @MinLength(5)
  text: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=xxx' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional({ example: '2025-01-20' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
