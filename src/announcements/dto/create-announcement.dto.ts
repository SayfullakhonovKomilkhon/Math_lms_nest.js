import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Перенос урока' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Урок в пятницу переносится на субботу в 10:00' })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message: string;

  @ApiProperty({ required: false, example: 'clx123abc' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
