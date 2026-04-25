import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeDto {
  @ApiProperty({ required: false, description: 'New email (login)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'New password, min 8 chars' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @ApiProperty({
    description: 'Current password, required when changing email or password',
  })
  @IsString()
  currentPassword: string;
}
