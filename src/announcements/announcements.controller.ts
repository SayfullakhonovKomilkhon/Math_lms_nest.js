import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

type Actor = { id: string; role: Role };

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private service: AnnouncementsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Создать объявление' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: Actor) {
    return this.service.create(dto, user);
  }

  @Get('my')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Объявления, видимые текущему пользователю' })
  getMy(@Query() query: QueryAnnouncementDto, @CurrentUser() user: Actor) {
    return this.service.getMy(user, query);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Все объявления центра (Admin/SuperAdmin)' })
  getAll(@Query() query: QueryAnnouncementDto) {
    return this.service.getAll(query);
  }

  @Get('unread-count')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Количество непрочитанных объявлений' })
  getUnreadCount(@CurrentUser() user: Actor) {
    return this.service.getUnreadCount(user);
  }

  @Patch('read-all')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Отметить все объявления прочитанными' })
  markAllAsRead(@CurrentUser() user: Actor) {
    return this.service.markAllAsRead(user);
  }

  @Patch(':id/read')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Отметить объявление прочитанным' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.service.markAsRead(id, user.id);
  }

  @Patch(':id/pin')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Закрепить / открепить объявление' })
  togglePin(@Param('id') id: string) {
    return this.service.togglePin(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Удалить объявление' })
  delete(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.service.delete(id, user);
  }
}
