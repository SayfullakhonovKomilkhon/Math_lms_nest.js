import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({
    example: 250000,
    description: 'Сумма расхода в сумах. Должна быть положительной.',
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    example: 'Канцелярия',
    description:
      'Категория расхода (бумага, вода, доставка, аренда и т.д.). Свободный текст, чтобы админ сам решал, как структурировать.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category: string;

  @ApiPropertyOptional({
    example: 'Бумага A4, 5 пачек',
    description: 'Подробности — что именно купили / на что потратили.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: '2026-04-26',
    description:
      'Дата фактического расхода. Если не указана — берётся текущая.',
  })
  @IsOptional()
  @IsDateString()
  spentAt?: string;
}
