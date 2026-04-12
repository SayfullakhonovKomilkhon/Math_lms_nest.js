import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EditGradeDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
