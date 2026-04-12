import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { GroupsModule } from './groups/groups.module';
import { ParentsModule } from './parents/parents.module';
import { AttendanceModule } from './attendance/attendance.module';
import { GradesModule } from './grades/grades.module';
import { HomeworkModule } from './homework/homework.module';
import { LessonTopicsModule } from './lesson-topics/lesson-topics.module';
import { PaymentsModule } from './payments/payments.module';
import { SalaryModule } from './salary/salary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    GroupsModule,
    ParentsModule,
    AttendanceModule,
    GradesModule,
    HomeworkModule,
    LessonTopicsModule,
    PaymentsModule,
    SalaryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
