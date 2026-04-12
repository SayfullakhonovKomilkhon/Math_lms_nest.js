import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GradesService } from './grades.service';
import { BulkGradesDto } from './dto/bulk-grades.dto';
import { EditGradeDto } from './dto/edit-grade.dto';
import { QueryGradesDto, RatingQueryDto } from './dto/query-grades.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private service: GradesService) {}

  @Post('bulk')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Bulk create grades for a group' })
  bulkCreate(
    @Body() dto: BulkGradesDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.bulkCreate(dto, user);
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get grades' })
  findAll(
    @Query() query: QueryGradesDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.findAll(query, user);
  }

  @Get('my')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own grades' })
  findMy(
    @Query() query: { lessonType?: string; from?: string; to?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.findMy(query, userId);
  }

  @Get('my/stats')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own grade stats' })
  findMyStats(@CurrentUser('id') userId: string) {
    return this.service.findMyStats(userId);
  }

  @Get('my/rating')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own place in group rating' })
  getMyRating(
    @Query() query: { period?: 'month' | 'quarter' | 'all' },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.findMyRating(query, userId);
  }

  @Get('rating/:groupId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get group rating by average score' })
  getRating(
    @Param('groupId') groupId: string,
    @Query() query: RatingQueryDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.getRating(groupId, query, user);
  }

  @Get('average/:studentId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get average grade for a student' })
  getAverage(
    @Param('studentId') studentId: string,
    @Query() query: { from?: string; to?: string; lessonType?: string },
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.getStudentAverage(studentId, query, user);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Edit grade (within 24h of gradedAt)' })
  update(
    @Param('id') id: string,
    @Body() dto: EditGradeDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.update(id, dto, user);
  }
}
