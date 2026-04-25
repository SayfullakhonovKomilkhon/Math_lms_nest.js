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
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { EditAttendanceDto } from './dto/edit-attendance.dto';
import {
  QueryAttendanceDto,
  SummaryQueryDto,
} from './dto/query-attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Post('bulk')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk mark attendance for a group lesson' })
  bulkCreate(
    @Body() dto: BulkAttendanceDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.bulkCreate(dto, user);
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get attendance records' })
  findAll(
    @Query() query: QueryAttendanceDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.findAll(query, user);
  }

  @Get('my')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own attendance records' })
  findMy(
    @Query() query: { from?: string; to?: string; groupId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.findMy(query, userId);
  }

  @Get('summary')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get attendance summary for a group' })
  getSummary(
    @Query() query: SummaryQueryDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.getSummary(query, user);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Edit attendance record with reason' })
  update(
    @Param('id') id: string,
    @Body() dto: EditAttendanceDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.update(id, dto, user);
  }
}
