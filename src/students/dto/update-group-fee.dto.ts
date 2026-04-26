import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateGroupFeeDto {
  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyFee: number;
}
