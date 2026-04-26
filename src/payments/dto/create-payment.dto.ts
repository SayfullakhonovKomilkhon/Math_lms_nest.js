import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
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

/**
 * Used by admins to record an offline (cash/transfer) payment directly from
 * the student row. Optionally accepts a receipt file in the same multipart
 * request. Resulting payment is created as CONFIRMED.
 */
export class CreateManualPaymentDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    example: '2025-02-01',
    description: 'Дата оплаты. Если не указана — берётся текущая.',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: '2025-03-01' })
  @IsOptional()
  @IsDateString()
  nextPaymentDate?: string;
}

export class RejectPaymentDto {
  @ApiProperty({ example: 'Чек нечитаемый, загрузите другой' })
  @IsString()
  rejectReason: string;
}
