import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationSource } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateApplicationDto } from './create-application.dto';

export class CreateManualApplicationDto extends CreateApplicationDto {
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
