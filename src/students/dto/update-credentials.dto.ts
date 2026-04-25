import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCredentialsDto {
  @ApiPropertyOptional({ example: 'new-email@mathcenter.uz' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'new-strong-password', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
