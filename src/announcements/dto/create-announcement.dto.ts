import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Выходной 1 мая' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Уважаемые ученики, 1 мая занятий не будет' })
  @IsString()
  message: string;

  @ApiProperty({ required: false, example: 'group-id' })
  @IsOptional()
  @IsString()
  groupId?: string;
}
