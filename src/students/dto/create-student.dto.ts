import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Gender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { normalizePhone } from '../../common/utils/phone';

export class CreateStudentDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Phone number used as the login identifier',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @ApiProperty({ example: 'Student123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Alijon Valiyev' })
  @IsString()
  fullName: string;

  @ApiProperty({ required: false, example: '2005-06-15' })
  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    required: false,
    example: 'group-id',
    description:
      "Optional initial group. If provided, a StudentGroup link is created with `monthlyFee` (or 0 by default).",
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    required: false,
    example: 500000,
    description:
      "Monthly fee for the initial group link. Ignored if `groupId` isn't set.",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyFee?: number;
}
