import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { AssignGroupDto } from './dto/assign-group.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new student' })
  create(
    @Body() dto: CreateStudentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.create(dto, actorId);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all students' })
  findAll() {
    return this.studentsService.findAll();
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own student profile' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.studentsService.findMyProfile(userId);
  }

  @Patch('me')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Update own account data (name, phone, email, password)',
  })
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.studentsService.updateMyProfile(userId, dto);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get student by ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.studentsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update student' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.update(id, dto, actorId);
  }

  @Patch(':id/group')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Assign student to group' })
  assignGroup(
    @Param('id') id: string,
    @Body() dto: AssignGroupDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.assignGroup(id, dto.groupId, actorId);
  }

  @Patch(':id/remove-group')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Remove student from group' })
  removeFromGroup(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.removeFromGroup(id, actorId);
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate student' })
  deactivate(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.deactivate(id, actorId);
  }
}
