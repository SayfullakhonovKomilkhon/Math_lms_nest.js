import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentsController {
  constructor(private parentsService: ParentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new parent' })
  create(
    @Body() dto: CreateParentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.parentsService.create(dto, actorId);
  }

  @Get('me')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get own parent profile' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.parentsService.findMyProfile(userId);
  }

  @Get('me/child/attendance')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get child attendance' })
  getChildAttendance(
    @Query() query: { from?: string; to?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.getChildAttendance(userId, query);
  }

  @Get('me/child/grades')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get child grades' })
  getChildGrades(
    @Query() query: { from?: string; to?: string; lessonType?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.getChildGrades(userId, query);
  }

  @Get('me/child/homework')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get child homework' })
  getChildHomework(@CurrentUser('id') userId: string) {
    return this.parentsService.getChildHomework(userId);
  }

  @Get('me/child/payments')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get child payment history' })
  getChildPayments(@CurrentUser('id') userId: string) {
    return this.parentsService.getChildPayments(userId);
  }

  @Post('me/child/payments/receipt')
  @Roles(Role.PARENT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload payment receipt for child' })
  uploadChildReceipt(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.uploadChildReceipt(userId, file);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get parent by ID' })
  findOne(@Param('id') id: string) {
    return this.parentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update parent' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.parentsService.update(id, dto, actorId);
  }
}
