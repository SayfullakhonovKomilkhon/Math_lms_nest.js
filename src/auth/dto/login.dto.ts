import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Phone number used as the login identifier',
  })
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
