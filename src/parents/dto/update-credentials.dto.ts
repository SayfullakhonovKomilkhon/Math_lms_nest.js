import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateParentCredentialsDto {
  @ApiPropertyOptional({ example: 'parent@mathcenter.uz' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'new-strong-password', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
