import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeDto {
  @ApiProperty({ required: false, description: 'New phone (login)' })
  @IsOptional()
  @IsString()
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
