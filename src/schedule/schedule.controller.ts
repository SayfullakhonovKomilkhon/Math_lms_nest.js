import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private service: ScheduleService) {}

  @Get('my')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get schedule for current student' })
  getMySchedule(@CurrentUser('id') userId: string) {
    return this.service.getMySchedule(userId);
  }

  @Get('group/:groupId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get schedule for a group' })
  getGroupSchedule(
    @Param('groupId') groupId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.getGroupSchedule(groupId, user);
  }
}
