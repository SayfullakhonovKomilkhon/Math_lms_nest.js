import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { normalizePhone } from '../../common/utils/phone';

export class CreateApplicationDto {
  @ApiProperty({ example: 'Алишер Каримов' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  fullName: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @Matches(/^\+[0-9]{9,15}$/, {
    message: 'phone must be a valid international phone number',
  })
  phone: string;

  @ApiProperty({ example: 14, minimum: 5, maximum: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(25)
  childAge: number;
}
