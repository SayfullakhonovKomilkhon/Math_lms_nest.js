import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class EditAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ example: 'Ученик пришёл позже' })
  @IsString()
  @MinLength(3)
  editReason: string;
}
