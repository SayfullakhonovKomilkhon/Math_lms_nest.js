import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateMyProfileDto {
  @ApiProperty({ required: false, example: 'Alijon Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiProperty({ required: false, example: '+998901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ required: false, example: 'student@mathcenter.uz' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
    description: 'Required when changing email or password',
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
