import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
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
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { UpdateParentCredentialsDto } from './dto/update-credentials.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadThrottleGuard } from '../common/guards/upload-throttle.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentsController {
  constructor(private parentsService: ParentsService) {}

  // ---------- Admin / SuperAdmin --------------------------------------

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'List all parents' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('search') search?: string) {
    return this.parentsService.findAll({ search });
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new parent' })
  create(@Body() dto: CreateParentDto, @CurrentUser('id') actorId: string) {
    return this.parentsService.create(dto, actorId);
  }

  // ---------- Parent self-service (must precede ":id" routes) ---------

  @Get('me')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get own parent profile + linked children' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.parentsService.findMyProfile(userId);
  }

  @Get('me/child/attendance')
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: 'Get child attendance (?studentId= picks which child)',
  })
  getChildAttendance(
    @Query() query: { from?: string; to?: string; studentId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.getChildAttendance(userId, query);
  }

  @Get('me/child/grades')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get child grades' })
  getChildGrades(
    @Query()
    query: {
      from?: string;
      to?: string;
      lessonType?: string;
      studentId?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.getChildGrades(userId, query);
  }

  @Get('me/child/homework')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get child homework' })
  getChildHomework(
    @Query() query: { studentId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.getChildHomework(userId, query);
  }

  @Get('me/child/payments')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get child payment history' })
  getChildPayments(
    @Query() query: { studentId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.getChildPayments(userId, query);
  }

  @Get('me/child/rating')
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: "Get child's place in the group rating (mirrors /grades/my/rating)",
  })
  getChildRating(
    @Query()
    query: {
      period?: 'month' | 'quarter' | 'all';
      studentId?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.getChildRating(userId, query);
  }

  @Post('me/child/payments/receipt')
  @Roles(Role.PARENT)
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
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload payment receipt for child' })
  uploadChildReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Body('studentId') studentId: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    return this.parentsService.uploadChildReceipt(userId, file, studentId);
  }

  // ---------- Admin: parent-by-id -------------------------------------

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get parent by ID' })
  findOne(@Param('id') id: string) {
    return this.parentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update parent profile' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.parentsService.update(id, dto, actorId);
  }

  @Patch(':id/credentials')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Reset parent email and/or password (no old password required)',
  })
  updateCredentials(
    @Param('id') id: string,
    @Body() dto: UpdateParentCredentialsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.parentsService.updateCredentials(id, dto, actorId);
  }

  @Post(':id/students/:studentId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Link a student (child) to this parent' })
  linkStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.parentsService.linkStudent(id, studentId, actorId);
  }

  @Delete(':id/students/:studentId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Unlink a student (child) from this parent' })
  unlinkStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.parentsService.unlinkStudent(id, studentId, actorId);
  }
}
