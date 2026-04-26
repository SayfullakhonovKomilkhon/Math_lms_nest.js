import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizePhone } from '../../common/utils/phone';

export class UpdateMyProfileDto {
  @ApiProperty({ required: false, example: 'Alijon Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiProperty({
    required: false,
    example: '+998901234567',
    description:
      'Phone number — also used as the login identifier. Changing it requires currentPassword.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone?: string;

  @ApiProperty({
    required: false,
    description: 'Required when changing phone or password',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ required: false, example: 'NewPassword123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword?: string;
}
