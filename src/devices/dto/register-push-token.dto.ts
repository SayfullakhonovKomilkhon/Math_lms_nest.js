import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MaxLength(255)
  token: string;

  @IsString()
  @MaxLength(160)
  deviceId: string;

  @IsString()
  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}
