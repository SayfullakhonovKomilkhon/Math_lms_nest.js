import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeacherDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Phone number used as the login identifier',
  })
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @ApiProperty({ example: 'Teacher123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Bobur Toshmatov' })
  @IsString()
  fullName: string;

  @ApiProperty({ required: false, example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ratePerStudent?: number;
}
