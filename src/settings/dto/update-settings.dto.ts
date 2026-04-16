import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingEntryDto {
  @ApiProperty({ example: 'centerName' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'MathCenter' })
  @IsString()
  value: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingEntryDto)
  settings: SettingEntryDto[];
}
