import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeacherDto {
  @ApiProperty({ example: 'teacher@mathcenter.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Teacher123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Bobur Toshmatov' })
  @IsString()
  fullName: string;

  @ApiProperty({ required: false, example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ratePerStudent?: number;
}
