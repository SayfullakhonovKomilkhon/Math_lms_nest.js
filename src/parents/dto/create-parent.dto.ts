import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateParentDto {
  @ApiProperty({ example: 'parent@mathcenter.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Parent123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Sherzod Valiyev' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  // Modern: link any number of children at creation time.
  @ApiPropertyOptional({
    description: 'IDs of students to link to this parent',
    example: ['student-id-1', 'student-id-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  studentIds?: string[];

  // Legacy: single-student field, kept so old admin forms keep working.
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Deprecated: use studentIds. Kept for backwards compatibility.',
    example: 'student-id',
  })
  @IsOptional()
  @IsString()
  studentId?: string;
}
