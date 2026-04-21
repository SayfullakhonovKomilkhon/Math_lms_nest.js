import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAnnouncementDto {
  @ApiPropertyOptional({ description: 'Фильтр по группе' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value !== ''
      ? parseInt(value, 10)
      : typeof value === 'number'
        ? value
        : undefined,
  )
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value !== ''
      ? parseInt(value, 10)
      : typeof value === 'number'
        ? value
        : undefined,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
