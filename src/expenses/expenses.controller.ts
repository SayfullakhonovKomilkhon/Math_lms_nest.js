import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadThrottleGuard } from '../common/guards/upload-throttle.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Post()
  @UseGuards(UploadThrottleGuard)
  @Throttle({ default: { limit: 120, ttl: 1000 * 60 * 60 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    // Accept both JSON and multipart so admin can either type the entry
    // quickly or attach a receipt photo.
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        amount: { type: 'number', example: 250000 },
        category: { type: 'string', example: 'Канцелярия' },
        description: { type: 'string', example: 'Бумага A4, 5 пачек' },
        spentAt: { type: 'string', example: '2026-04-26' },
      },
      required: ['amount', 'category'],
    },
  })
  @ApiOperation({ summary: 'Создать запись о расходе центра' })
  create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateExpenseDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.create(dto, file, actorId);
  }

  @Get()
  @ApiOperation({ summary: 'Список расходов с фильтрами' })
  findAll(@Query() query: QueryExpensesDto) {
    return this.service.findAll(query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Сводка: категории, итог за текущий месяц, разбивка по категориям',
  })
  getSummary() {
    return this.service.getSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить запись о расходе' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить запись о расходе' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.update(id, dto, actorId);
  }

  @Post(':id/receipt')
  @UseGuards(UploadThrottleGuard)
  @Throttle({ default: { limit: 30, ttl: 1000 * 60 * 60 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Прикрепить/заменить чек к расходу' })
  attachReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.attachReceipt(id, file, actorId);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Получить временную ссылку на чек расхода' })
  getReceiptUrl(@Param('id') id: string) {
    return this.service.getReceiptUrl(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить запись о расходе' })
  remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.service.remove(id, actorId);
  }
}
