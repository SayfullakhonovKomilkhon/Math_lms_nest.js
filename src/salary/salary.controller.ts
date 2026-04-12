import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SalaryService } from './salary.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('salary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salary')
export class SalaryController {
  constructor(private service: SalaryService) {}

  @Get('my')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get current teacher salary based on active students' })
  getMySalary(@CurrentUser('id') userId: string) {
    return this.service.getMySalary(userId);
  }

  @Get('teachers')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get salary for all teachers' })
  getAllSalaries() {
    return this.service.getAllSalaries();
  }
}
