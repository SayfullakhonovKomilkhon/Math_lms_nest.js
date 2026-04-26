import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateParentDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Phone number used as the login identifier',
  })
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @ApiProperty({ example: 'Parent123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Sherzod Valiyev' })
  @IsString()
  fullName: string;

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
