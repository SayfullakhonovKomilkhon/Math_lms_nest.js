import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MinLength } from 'class-validator';
import { normalizePhone } from '../../common/utils/phone';

export class LoginDto {
  @ApiProperty({
    example: '+998901234567',
    description:
      'Phone number used as the login identifier. The "+998" prefix is optional — bare 9-digit Uzbek numbers (e.g. "901234567") are accepted and normalised server-side.',
  })
  @IsString()
  // Normalise BEFORE validation runs so a user can type "901234567" or
  // "+998 90 123 45 67" and we still match the canonical stored value.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
