import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { SalaryService } from './salary.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateRateDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rate: number;
}

@ApiTags('salary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salary')
export class SalaryController {
  constructor(private service: SalaryService) {}

  @Get('my')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Get current teacher salary based on active students',
  })
  getMySalary(@CurrentUser('id') userId: string) {
    return this.service.getMySalary(userId);
  }

  @Get('teachers')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get salary for all teachers' })
  getAllSalaries() {
    return this.service.getAllSalaries();
  }

  @Get('teachers/:id/history')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get 6-month salary history for a teacher' })
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Patch('teachers/:id/rate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update ratePerStudent for a teacher' })
  updateRate(
    @Param('id') id: string,
    @Body() dto: UpdateRateDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.updateRate(id, dto.rate, actorId);
  }
}
