import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizePhone } from '../../common/utils/phone';

export class UpdateMeDto {
  @ApiProperty({ required: false, description: 'New phone (login)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone?: string;

  @ApiProperty({ required: false, description: 'New password, min 8 chars' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @ApiProperty({
    description: 'Current password, required when changing phone or password',
  })
  @IsString()
  currentPassword: string;
}
