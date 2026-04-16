import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { S3Service } from '../common/services/s3.service';

@ApiTags('homework')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homework')
export class HomeworkController {
  constructor(
    private service: HomeworkService,
    private s3: S3Service,
  ) {}

  @Post('upload-image')
  @Roles(Role.TEACHER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @ApiOperation({ summary: 'Upload homework image to S3' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.s3.uploadFile(file, 'homework');
    return { url };
  }

  @Post()
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Create homework for a group' })
  create(
    @Body() dto: CreateHomeworkDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get homework for a group' })
  findAll(
    @Query('groupId') groupId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.findAll(groupId, user);
  }

  @Get('my')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own homework' })
  findMy(
    @Query('limit') limit: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.findMy(limit ? parseInt(limit, 10) : 10, userId);
  }

  @Get('my/latest')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get latest homework' })
  findMyLatest(@CurrentUser('id') userId: string) {
    return this.service.findMyLatest(userId);
  }

  @Get('latest/:groupId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get latest homework for a group' })
  findLatest(
    @Param('groupId') groupId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.findLatest(groupId, user);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update homework' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHomeworkDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete homework' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.remove(id, user);
  }
}
