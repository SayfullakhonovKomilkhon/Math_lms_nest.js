import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IsOptional, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class NotificationsQueryDto {
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true')
  isRead?: boolean;

  @IsOptional() @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  page?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getAll(@Request() req, @Query() query: NotificationsQueryDto) {
    return this.notificationsService.getNotifications(req.user.id, {
      isRead: query.isRead,
      type: query.type,
      limit: query.limit,
      page: query.page,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    await this.notificationsService.markRead(id, req.user.id);
    return { success: true };
  }

  @Patch('read-all')
  async markAllRead(@Request() req) {
    await this.notificationsService.markAllRead(req.user.id);
    return { success: true };
  }
}
