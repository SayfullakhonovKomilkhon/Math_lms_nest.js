import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IsNumber, Min, Max } from 'class-validator';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class CalculateDto {
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() @Min(2020) year: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('achievements')
export class GamificationController {
  constructor(
    private gamificationService: GamificationService,
    private prisma: PrismaService,
  ) {}

  @Get('my')
  @Roles(Role.STUDENT)
  async getMy(@Request() req) {
    const student = await this.prisma.student.findUnique({
      where: { userId: req.user.id },
    });
    if (!student) return null;
    return this.gamificationService.getStudentAchievements(student.id);
  }

  @Get('student/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.PARENT)
  async getStudentAchievements(@Param('id') id: string, @Request() req) {
    if (req.user.role === Role.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { studentId: id, parent: { userId: req.user.id } },
        select: { parentId: true },
      });
      if (!link) {
        return null;
      }
    }
    return this.gamificationService.getStudentAchievements(id);
  }

  @Get('my/progress')
  @Roles(Role.STUDENT)
  async getMyProgress(@Request() req) {
    const student = await this.prisma.student.findUnique({
      where: { userId: req.user.id },
    });
    if (!student) return null;
    return this.gamificationService.computeStudentProgress(student.id);
  }

  @Get('student/:id/progress')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.PARENT)
  async getStudentProgress(@Param('id') id: string, @Request() req) {
    if (req.user.role === Role.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { studentId: id, parent: { userId: req.user.id } },
        select: { parentId: true },
      });
      if (!link) return null;
    }
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.id },
      });
      // Teacher may view a student if any of the student's groups is theirs.
      const student = await this.prisma.student.findUnique({
        where: { id },
        select: {
          groups: { select: { group: { select: { teacherId: true } } } },
        },
      });
      const teachesAny = student?.groups.some(
        (g) => g.group.teacherId === teacher?.id,
      );
      if (!teacher || !teachesAny) return null;
    }
    return this.gamificationService.computeStudentProgress(id);
  }

  @Get('group/:groupId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
  async getGroupAchievements(
    @Param('groupId') groupId: string,
    @Request() req,
  ) {
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.id },
      });
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
      });
      if (!teacher || group?.teacherId !== teacher.id) {
        return [];
      }
    }
    return this.gamificationService.getGroupAchievements(groupId);
  }

  @Get('center/top')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getCenterTop() {
    return this.gamificationService.getCenterTopStudents(10);
  }

  @Post('calculate')
  @Roles(Role.SUPER_ADMIN)
  async calculate(@Body() dto: CalculateDto) {
    return this.gamificationService.calculateMonthlyAchievements(
      dto.month,
      dto.year,
    );
  }
}
