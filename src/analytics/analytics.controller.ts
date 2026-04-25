import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import {
  DateRangeQueryDto,
  RevenueQueryDto,
  StudentsGrowthQueryDto,
} from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Dashboard overview metrics' })
  getOverview() {
    return this.service.getOverview();
  }

  @Get('revenue')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revenue by month for a given year' })
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.service.getRevenue(query);
  }

  @Get('students-growth')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'New and total students over time' })
  getStudentsGrowth(@Query() query: StudentsGrowthQueryDto) {
    return this.service.getStudentsGrowth(query);
  }

  @Get('attendance-center')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Attendance stats for the whole center' })
  getAttendanceCenter(@Query() query: DateRangeQueryDto) {
    return this.service.getAttendanceCenter(query);
  }

  @Get('grades-center')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Grades analytics for the whole center' })
  getGradesCenter(@Query() query: DateRangeQueryDto) {
    return this.service.getGradesCenter(query);
  }

  @Get('debtors')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Students without confirmed payment this month' })
  getDebtors() {
    return this.service.getDebtors();
  }

  @Get('teachers-load')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Teachers workload and salary overview' })
  getTeachersLoad() {
    return this.service.getTeachersLoad();
  }
}
