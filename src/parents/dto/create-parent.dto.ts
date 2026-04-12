import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ required: false, example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'student-id' })
  @IsString()
  studentId: string;
}
