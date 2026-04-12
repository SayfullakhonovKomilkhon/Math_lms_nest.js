import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private service: AnnouncementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create an announcement' })
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.create(dto, user);
  }

  @Get('my')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER)
  @ApiOperation({ summary: 'Get announcements for current user' })
  findMy(@CurrentUser() user: { id: string; role: Role }) {
    return this.service.findMy(user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all announcements' })
  findAll() {
    return this.service.findAll();
  }
}
