import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateStudentDto {
  @ApiProperty({ example: 'student@mathcenter.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Student123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Alijon Valiyev' })
  @IsString()
  fullName: string;

  @ApiProperty({ required: false, example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: '2005-06-15' })
  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ required: false, example: 'group-id' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ required: false, example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyFee?: number;
}
