import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignGroupDto {
  @ApiProperty({ example: 'group-id' })
  @IsString()
  groupId: string;
}
