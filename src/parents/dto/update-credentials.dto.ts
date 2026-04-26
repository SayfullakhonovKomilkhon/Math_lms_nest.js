import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateParentCredentialsDto {
  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'New phone (also used as the login identifier)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'new-strong-password', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
