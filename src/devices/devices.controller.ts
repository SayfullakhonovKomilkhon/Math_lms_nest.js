import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post('push-token')
  @ApiOperation({
    summary: 'Register or refresh the current mobile device push token',
  })
  register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.devices.register(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List current user mobile devices' })
  getMine(@CurrentUser('id') userId: string) {
    return this.devices.getMine(userId);
  }

  @Delete(':deviceId')
  @ApiOperation({ summary: 'Unregister a mobile device' })
  unregister(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devices.unregister(userId, deviceId);
  }
}
