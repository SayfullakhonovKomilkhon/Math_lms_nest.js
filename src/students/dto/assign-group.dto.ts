import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AssignGroupDto {
  @ApiProperty({ example: 'group-id' })
  @IsString()
  groupId: string;

  @ApiProperty({
    required: false,
    example: 500000,
    description: 'Monthly fee for this student in this group (currency units)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyFee?: number;
}
