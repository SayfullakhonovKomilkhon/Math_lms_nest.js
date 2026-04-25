import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import {
  AttendanceReportQueryDto,
  DateRangeQueryDto,
  PaymentsReportQueryDto,
  StudentsReportQueryDto,
} from './dto/reports-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sendFile(res: Response, buf: Buffer, mime: string, filename: string) {
  res.set({
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buf.length,
  });
  res.end(buf);
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  // ── Finance ───────────────────────────────────────────────────────────────

  @Get('finance/excel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export finance report to Excel (3 sheets)' })
  @ApiProduces(XLSX_MIME)
  async financeExcel(
    @Query() query: PaymentsReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.service.financeExcel(query);
    sendFile(res, buf, XLSX_MIME, `finance-${today()}.xlsx`);
  }

  @Get('finance/pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export finance report to PDF' })
  @ApiProduces('application/pdf')
  async financePdf(
    @Query() query: PaymentsReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.service.financePdf(query);
    sendFile(res, buf, 'application/pdf', `finance-${today()}.pdf`);
  }

  // ── Payments (legacy) ─────────────────────────────────────────────────────

  @Get('payments/excel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export payments to Excel (.xlsx)' })
  @ApiProduces(XLSX_MIME)
  async paymentsExcel(
    @Query() query: PaymentsReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.service.paymentsExcel(query);
    sendFile(res, buf, XLSX_MIME, `payments-${today()}.xlsx`);
  }

  @Get('payments/pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export payments to PDF' })
  @ApiProduces('application/pdf')
  async paymentsPdf(
    @Query() query: PaymentsReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.service.paymentsPdf(query);
    sendFile(res, buf, 'application/pdf', `payments-${today()}.pdf`);
  }

  // ── Students ──────────────────────────────────────────────────────────────

  @Get('students/excel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export students list to Excel (.xlsx)' })
  @ApiProduces(XLSX_MIME)
  async studentsExcel(
    @Query() query: StudentsReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.service.studentsExcel(query);
    sendFile(res, buf, XLSX_MIME, `students-${today()}.xlsx`);
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  @Get('attendance/excel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Export attendance records to Excel (with group summary)',
  })
  @ApiProduces(XLSX_MIME)
  async attendanceExcel(
    @Query() query: AttendanceReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.service.attendanceExcel(query);
    sendFile(res, buf, XLSX_MIME, `attendance-${today()}.xlsx`);
  }

  // ── Grades ────────────────────────────────────────────────────────────────

  @Get('grades/excel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export grades to Excel (grades + rating sheets)' })
  @ApiProduces(XLSX_MIME)
  async gradesExcel(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const buf = await this.service.gradesExcel(query);
    sendFile(res, buf, XLSX_MIME, `grades-${today()}.xlsx`);
  }

  // ── Salary ────────────────────────────────────────────────────────────────

  @Get('salary/excel')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export salary report to Excel' })
  @ApiProduces(XLSX_MIME)
  async salaryExcel(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const buf = await this.service.salaryExcel(query);
    sendFile(res, buf, XLSX_MIME, `salary-${today()}.xlsx`);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
