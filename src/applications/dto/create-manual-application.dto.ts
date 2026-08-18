import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationSource } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateApplicationDto } from './create-application.dto';
import { normalizePhone } from '../../common/utils/phone';

export class CreateManualApplicationDto extends CreateApplicationDto {
  @ApiProperty({ example: 'Малика Каримова' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  parentFullName: string;

  @ApiProperty({ example: '+998901234568' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @Matches(/^\+[0-9]{9,15}$/, {
    message: 'parentPhone must be a valid international phone number',
  })
  parentPhone: string;

  @ApiProperty({
    enum: ApplicationSource,
    example: ApplicationSource.ADVERTISEMENT,
  })
  @IsEnum(ApplicationSource)
  source: ApplicationSource;

  @ApiPropertyOptional({
    example: 'Реклама в Instagram, август',
    maxLength: 240,
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  sourceDetails?: string;

  @ApiPropertyOptional({
    example: 'Интересуется подготовкой к Westminster',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  note?: string;
}
