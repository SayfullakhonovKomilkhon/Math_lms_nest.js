import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGroupDto {
  @ApiProperty({ example: 'Group A' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'teacher-id' })
  @IsString()
  teacherId: string;

  @ApiProperty({ required: false, example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  maxStudents?: number;

  @ApiProperty({
    example: { days: ['MONDAY', 'WEDNESDAY'], time: '09:00', duration: 90 },
  })
  @IsObject()
  schedule: Record<string, unknown>;
}
