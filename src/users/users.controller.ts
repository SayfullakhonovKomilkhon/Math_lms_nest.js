import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

class CreateStaffDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'phone must be a valid phone number' })
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(['TEACHER', 'ADMIN'])
  role: 'TEACHER' | 'ADMIN';

  @IsOptional()
  @IsString()
  fullName?: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  findAll(@Query('role') role?: string) {
    return this.usersService.findAll(role);
  }

  // ── Staff ─────────────────────────────────────────────────────────────────

  @Get('staff')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all staff (teachers + admins)' })
  getStaff() {
    return this.usersService.getStaff();
  }

  @Post('staff')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create teacher or admin in a single transaction' })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(dto);
  }

  @Patch('staff/:id/deactivate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate a staff member' })
  deactivateStaff(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.usersService.deactivate(id, actorId);
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  @Get('audit-log')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get audit log with filters' })
  getAuditLog(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usersService.getAuditLog({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      action,
      userId,
      from,
      to,
    });
  }

  // Legacy alias
  @Get('audit')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get audit log (legacy)' })
  getAuditLogLegacy(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
  ) {
    return this.usersService.getAuditLog({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      action,
    });
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate a user account' })
  deactivate(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.usersService.deactivate(id, actorId);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user credentials (phone / password)' })
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.updateCredentials(id, dto, actorId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
