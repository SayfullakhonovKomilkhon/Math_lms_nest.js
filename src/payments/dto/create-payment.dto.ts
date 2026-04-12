import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: '2025-02-01' })
  @IsOptional()
  @IsDateString()
  nextPaymentDate?: string;
}

export class RejectPaymentDto {
  @ApiProperty({ example: 'Чек нечитаемый, загрузите другой' })
  @IsString()
  rejectReason: string;
}
