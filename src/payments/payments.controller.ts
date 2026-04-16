import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, RejectPaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadThrottleGuard } from '../common/guards/upload-throttle.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create payment record' })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.create(dto, actorId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all payments' })
  findAll(@Query() query: QueryPaymentsDto) {
    return this.service.findAll(query);
  }

  @Get('debtors')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get students with no confirmed payment this month' })
  getDebtors() {
    return this.service.getDebtors();
  }

  @Get('my')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get payment status for current student' })
  findMy(@CurrentUser('id') userId: string) {
    return this.service.findMy(userId);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get payments for a student' })
  findByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.findByStudent(studentId, user);
  }

  @Post('upload-receipt')
  @Roles(Role.PARENT, Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(UploadThrottleGuard)
  @Throttle({ default: { limit: 20, ttl: 1000 * 60 * 60 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        studentId: { type: 'string' },
      },
      required: ['file', 'studentId'],
    },
  })
  @ApiOperation({ summary: 'Upload payment receipt to S3' })
  uploadReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Body('studentId') studentId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.uploadReceipt(file, studentId, actorId);
  }

  @Patch(':id/confirm')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Confirm payment' })
  confirm(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.confirm(id, actorId);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject payment with reason' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.reject(id, dto, actorId);
  }
}
