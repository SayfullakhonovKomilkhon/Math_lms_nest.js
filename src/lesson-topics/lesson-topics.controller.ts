import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LessonTopicsService } from './lesson-topics.service';
import { CreateLessonTopicDto } from './dto/create-lesson-topic.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('lesson-topics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lesson-topics')
export class LessonTopicsController {
  constructor(private service: LessonTopicsService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Create lesson topic' })
  create(
    @Body() dto: CreateLessonTopicDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get lesson topics' })
  findAll(
    @Query() query: { groupId?: string; from?: string; to?: string },
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.findAll(query, user);
  }

  @Get('next/:groupId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get next lesson topic for a group' })
  findNext(@Param('groupId') groupId: string) {
    return this.service.findNext(groupId);
  }

  @Get('suggestions')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get distinct topic name suggestions across all groups',
  })
  findSuggestions(@Query() query: { q?: string; limit?: string }) {
    return this.service.findSuggestions({
      q: query.q,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
