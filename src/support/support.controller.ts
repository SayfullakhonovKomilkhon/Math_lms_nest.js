import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService, SupportActor } from './support.service';
import {
  AvailabilityDto,
  BookingDto,
  FeedbackDto,
  MoveDto,
  ReasonDto,
  ResultDto,
  TimeOffDto,
} from './support.dto';

@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.STUDENT, Role.PARENT)
export class SupportController {
  constructor(private readonly service: SupportService) {}
  @Get('me') me(@CurrentUser() user: SupportActor) {
    return this.service.overview(user);
  }
  @Get('feedback')
  @Roles(Role.TEACHER)
  feedback(
    @Query('groupId') groupId: string,
    @Query('date') date: string,
    @CurrentUser() user: SupportActor,
  ) {
    return this.service.groupFeedback(groupId, date, user);
  }
  @Post('feedback')
  @Roles(Role.TEACHER)
  saveFeedback(@Body() dto: FeedbackDto, @CurrentUser() user: SupportActor) {
    return this.service.saveFeedback(dto, user);
  }
  @Get('teachers')
  @Roles(Role.TEACHER)
  teachers() {
    return this.service.teachers();
  }
  @Get('slots')
  @Roles(Role.TEACHER)
  slots(
    @Query('teacherId') teacherId: string,
    @Query('feedbackId') feedbackId: string,
    @Query('bookingId') bookingId: string,
    @CurrentUser() user: SupportActor,
  ) {
    return this.service.slots(teacherId, feedbackId, user, bookingId);
  }
  @Put('availability')
  @Roles(Role.TEACHER)
  availability(
    @Body() dto: AvailabilityDto,
    @CurrentUser() user: SupportActor,
  ) {
    return this.service.setAvailability(dto, user);
  }
  @Post('time-off')
  @Roles(Role.TEACHER)
  timeOff(@Body() dto: TimeOffDto, @CurrentUser() user: SupportActor) {
    return this.service.addTimeOff(dto, user);
  }
  @Delete('time-off/:id')
  @Roles(Role.TEACHER)
  deleteTimeOff(@Param('id') id: string, @CurrentUser() user: SupportActor) {
    return this.service.deleteTimeOff(id, user);
  }
  @Post('bookings')
  @Roles(Role.TEACHER)
  book(@Body() dto: BookingDto, @CurrentUser() user: SupportActor) {
    return this.service.book(dto, user);
  }
  @Post('bookings/:id/cancel')
  @Roles(Role.TEACHER)
  cancel(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: SupportActor,
  ) {
    return this.service.cancel(id, dto, user);
  }
  @Post('bookings/:id/move')
  @Roles(Role.TEACHER)
  move(
    @Param('id') id: string,
    @Body() dto: MoveDto,
    @CurrentUser() user: SupportActor,
  ) {
    return this.service.move(id, dto, user);
  }
  @Post('bookings/:id/result')
  @Roles(Role.TEACHER)
  result(
    @Param('id') id: string,
    @Body() dto: ResultDto,
    @CurrentUser() user: SupportActor,
  ) {
    return this.service.result(id, dto, user);
  }
}
