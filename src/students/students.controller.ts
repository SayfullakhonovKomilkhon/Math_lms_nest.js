import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
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
import { UpdateGroupFeeDto } from './dto/update-group-fee.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
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
  create(@Body() dto: CreateStudentDto, @CurrentUser('id') actorId: string) {
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
    summary: 'Update own account data (name, phone, password)',
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

  // ----- Group memberships ---------------------------------------------------

  @Post(':id/groups')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Add student to a group with a per-link monthlyFee',
  })
  addGroup(
    @Param('id') id: string,
    @Body() dto: AssignGroupDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.addGroup(id, dto, actorId);
  }

  @Patch(':id/groups/:groupId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update the per-link monthlyFee for one group' })
  updateGroupFee(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupFeeDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.updateGroupFee(
      id,
      groupId,
      dto.monthlyFee,
      actorId,
    );
  }

  @Delete(':id/groups/:groupId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Remove student from a single group' })
  removeGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.removeGroup(id, groupId, actorId);
  }

  // Legacy endpoints kept for backwards compatibility with existing UI.
  // `PATCH :id/group` now *adds* a link (idempotent upsert) instead of
  // replacing the previous one — the request body is the same, but
  // semantics widened from 1:N to N:M.
  @Patch(':id/group')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary:
      '[Legacy] Add student to a group. Prefer POST /students/:id/groups.',
  })
  assignGroup(
    @Param('id') id: string,
    @Body() dto: AssignGroupDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.addGroup(id, dto, actorId);
  }

  @Patch(':id/remove-group')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary:
      '[Legacy] Remove student from ALL groups. Prefer DELETE /students/:id/groups/:groupId.',
  })
  removeFromGroup(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.studentsService.removeFromAllGroups(id, actorId);
  }

  // ---------------------------------------------------------------------------

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate student' })
  deactivate(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.studentsService.deactivate(id, actorId);
  }

  @Patch(':id/credentials')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Reset student phone and/or password (no old password required)',
  })
  updateCredentials(
    @Param('id') id: string,
    @Body() dto: UpdateCredentialsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.studentsService.updateCredentials(id, dto, actorId);
  }
}
