// Run only against the disposable support_test database after migrate deploy/build.
const assert = require('node:assert/strict');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { SupportService } = require('../dist/support/support.service');
const { GroupsService } = require('../dist/groups/groups.service');
const { StudentsService } = require('../dist/students/students.service');
const { clashesWithSchedule } = require('../dist/support/support-time');
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/support_test'))
  throw new Error('Use only the isolated support_test database');
const db = new PrismaService();
const service = new SupportService(db, { sendToUsers: async () => {} });
const run = Date.now().toString();
const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const start = new Date(`${day}T15:00:00+05:00`);
const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
const today = new Date(Date.now() + 18000000).toISOString().slice(0, 10);
const actor = (t) => ({ id: t.userId, role: 'TEACHER' });
async function teacher(n) {
  const u = await db.user.create({
    data: {
      phone: `${run}-t${n}`,
      passwordHash: 'test-only',
      role: 'TEACHER',
      teacher: { create: { fullName: `Teacher ${n}` } },
    },
    include: { teacher: true },
  });
  return u.teacher;
}
async function expectReject(work, status) {
  await assert.rejects(work, (e) => e.getStatus?.() === status);
}
async function main() {
  const t = await teacher(1),
    support = await teacher(2),
    stranger = await teacher(3);
  const g = await db.group.create({
    data: { name: 'Integration', teacherId: t.id, schedule: {} },
  });
  const students = [];
  for (let i = 0; i < 4; i++) {
    const u = await db.user.create({
      data: {
        phone: `${run}-s${i}`,
        passwordHash: 'test-only',
        role: 'STUDENT',
        student: {
          create: {
            fullName: `Student ${i}`,
            gender: 'MALE',
            groups: { create: { groupId: g.id } },
          },
        },
      },
      include: { student: true },
    });
    students.push(u.student);
  }
  const p = await db.user.create({
    data: {
      phone: `${run}-parent`,
      passwordHash: 'test-only',
      role: 'PARENT',
      parent: {
        create: {
          fullName: 'Parent',
          students: { create: { studentId: students[0].id } },
        },
      },
    },
  });
  const feedback = [];
  for (const s of students)
    feedback.push(
      await service.saveFeedback(
        {
          groupId: g.id,
          studentId: s.id,
          date: today,
          topic: 'Fractions',
          understanding: 'NEEDS_HELP',
          comment: 'Practice',
          privateNote: 'STAFF-SECRET',
        },
        actor(t),
      ),
    );
  await expectReject(
    () =>
      service.saveFeedback(
        {
          groupId: g.id,
          studentId: students[0].id,
          date: today,
          topic: 'X',
          understanding: 'UNDERSTOOD',
          comment: '',
          privateNote: '',
        },
        actor(stranger),
      ),
    403,
  );
  await service.setAvailability(
    {
      windows: [
        {
          weekday,
          startMinute: 900,
          endMinute: 1080,
          duration: 60,
          capacity: 2,
          location: 'Room 1',
        },
      ],
    },
    actor(support),
  );
  await expectReject(
    () =>
      service.setAvailability(
        {
          windows: [
            {
              weekday,
              startMinute: 900,
              endMinute: 1080,
              duration: 60,
              capacity: 2,
              location: 'Room 1',
            },
            {
              weekday,
              startMinute: 960,
              endMinute: 1080,
              duration: 60,
              capacity: 2,
              location: 'Room 2',
            },
          ],
        },
        actor(support),
      ),
    400,
  );
  await expectReject(
    () => service.slots(support.id, feedback[0].id, actor(stranger)),
    403,
  );
  const initial = await service.slots(support.id, feedback[0].id, actor(t));
  assert(initial.some((s) => s.startAt.getTime() === start.getTime()));
  const attempts = await Promise.allSettled(
    feedback
      .slice(0, 3)
      .map((f) =>
        service.book(
          {
            feedbackId: f.id,
            teacherId: support.id,
            startAt: start.toISOString(),
            task: 'Practice fractions',
          },
          actor(t),
        ),
      ),
  );
  assert.equal(
    attempts.filter((x) => x.status === 'fulfilled').length,
    2,
    'two seats must admit exactly two concurrent requests',
  );
  assert.equal(
    attempts.filter(
      (x) => x.status === 'rejected' && x.reason.getStatus() === 409,
    ).length,
    1,
  );
  const b = attempts.find((x) => x.status === 'fulfilled').value;
  await expectReject(
    () =>
      service.book(
        {
          feedbackId: b.feedbackId,
          teacherId: support.id,
          startAt: start.toISOString(),
          task: 'Duplicate',
        },
        actor(t),
      ),
    409,
  );
  await expectReject(
    () => service.cancel(b.id, { reason: 'Unauthorized' }, actor(stranger)),
    403,
  );
  await expectReject(
    () =>
      service.result(
        b.id,
        { status: 'COMPLETED', outcome: 'RESOLVED', result: 'Too early' },
        actor(support),
      ),
    400,
  );
  await expectReject(
    () =>
      service.addTimeOff(
        {
          startAt: start.toISOString(),
          endAt: new Date(start.getTime() + 3600000).toISOString(),
          reason: 'Busy',
        },
        actor(support),
      ),
    409,
  );
  const parentView = await service.overview({ id: p.id, role: 'PARENT' });
  assert(!JSON.stringify(parentView).includes('STAFF-SECRET'));
  assert(parentView.feedback.every((f) => f.studentId === students[0].id));
  assert(parentView.bookings.every((b) => b.student.id === students[0].id));
  const studentView = await service.overview({
    id: students[0].userId,
    role: 'STUDENT',
  });
  assert(!JSON.stringify(studentView).includes('STAFF-SECRET'));
  const supportView = await service.overview(actor(support));
  assert.equal(supportView.bookings.length, 2);
  assert(
    supportView.bookings.every(
      (b) => b.feedback.privateNote === 'STAFF-SECRET',
    ),
  );
  const groupService = new GroupsService(db);
  const conflictSchedule = {
    days: [
      [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ][weekday],
    ],
    time: '15:00',
    duration: 60,
  };
  await expectReject(
    () => groupService.update(g.id, { schedule: conflictSchedule }, t.userId),
    409,
  );
  assert.deepEqual(
    (await db.group.findUnique({ where: { id: g.id } })).schedule,
    {},
  );
  await expectReject(
    () =>
      groupService.create(
        { name: 'Conflict', teacherId: support.id, schedule: conflictSchedule },
        t.userId,
      ),
    409,
  );
  const studentService = new StudentsService(db, {}, {});
  const newGroup = await db.group.create({
    data: {
      name: 'Conflicting enrollment',
      teacherId: stranger.id,
      schedule: conflictSchedule,
    },
  });
  await expectReject(
    () =>
      studentService.addGroup(b.studentId, { groupId: newGroup.id }, t.userId),
    409,
  );
  const next = new Date(start.getTime() + 3600000).toISOString();
  await expectReject(
    () =>
      service.move(
        b.id,
        {
          teacherId: support.id,
          startAt: '2000-01-01T00:00:00Z',
          reason: 'Unavailable',
        },
        actor(t),
      ),
    409,
  );
  assert.equal(
    (await db.supportBooking.findUnique({ where: { id: b.id } })).status,
    'BOOKED',
    'failed move must preserve the old booking',
  );
  const moved = await service.move(
    b.id,
    { teacherId: support.id, startAt: next, reason: 'New time' },
    actor(t),
  );
  assert.equal(
    (await db.supportBooking.findUnique({ where: { id: b.id } })).status,
    'CANCELLED',
  );
  await service.cancel(moved.id, { reason: 'Cannot attend' }, actor(support));
  await expectReject(
    () => service.cancel(moved.id, { reason: 'Again' }, actor(t)),
    409,
  );
  const blockedStart = new Date(start.getTime() + 2 * 3600000),
    blockedEnd = new Date(start.getTime() + 3 * 3600000);
  const off = await service.addTimeOff(
    {
      startAt: blockedStart.toISOString(),
      endAt: blockedEnd.toISOString(),
      reason: 'Break',
    },
    actor(support),
  );
  assert(
    !(await service.slots(support.id, feedback[3].id, actor(t))).some(
      (s) => s.startAt.getTime() === blockedStart.getTime(),
    ),
  );
  await service.deleteTimeOff(off.id, actor(support));
  assert(
    (await service.slots(support.id, feedback[3].id, actor(t))).some(
      (s) => s.startAt.getTime() === blockedStart.getTime(),
    ),
  );
  const past = await db.supportSession.create({
    data: {
      teacherId: support.id,
      startAt: new Date(Date.now() - 2 * 3600000),
      endAt: new Date(Date.now() - 3600000),
      capacity: 2,
      location: 'Room 1',
    },
  });
  const prior = await db.supportBooking.create({
    data: {
      sessionId: past.id,
      studentId: students[3].id,
      feedbackId: feedback[3].id,
      referrerId: t.id,
      task: 'Past session',
    },
  });
  await expectReject(
    () =>
      service.result(
        prior.id,
        { status: 'COMPLETED', outcome: 'RESOLVED', result: 'Wrong teacher' },
        actor(t),
      ),
    403,
  );
  await service.result(
    prior.id,
    { status: 'COMPLETED', outcome: 'NEEDS_MORE', result: 'Needs revision' },
    actor(support),
  );
  assert.equal(
    (await db.supportBooking.findUnique({ where: { id: prior.id } })).outcome,
    'NEEDS_MORE',
  );
  // Support teacher may arrange a follow-up for the pupil they actually taught.
  await service.book(
    {
      feedbackId: feedback[3].id,
      teacherId: support.id,
      startAt: blockedStart.toISOString(),
      task: 'Follow up',
    },
    actor(support),
  );
  assert((await db.supportPushOutbox.count()) > 0);
  await service.deliverPush();
  assert.equal(await db.supportPushOutbox.count(), 0);
  assert(
    clashesWithSchedule(
      { days: [{ day: 'MON', startTime: '23:30', endTime: '01:00' }] },
      new Date('2026-09-22T00:15:00+05:00'),
      new Date('2026-09-22T00:45:00+05:00'),
    ),
  );
  assert(
    !clashesWithSchedule(
      { slots: [{ days: ['TUESDAY'], time: '09:00', duration: 60 }] },
      new Date('2026-09-22T10:00:00+05:00'),
      new Date('2026-09-22T11:00:00+05:00'),
    ),
  );
  const { Test } = require('@nestjs/testing');
  const { ValidationPipe } = require('@nestjs/common');
  const { SupportController } = require('../dist/support/support.controller');
  const { JwtAuthGuard } = require('../dist/common/guards/jwt-auth.guard');
  const request = require('supertest');
  const module = await Test.createTestingModule({
    controllers: [SupportController],
    providers: [{ provide: SupportService, useValue: service }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        req.user =
          req.headers['x-test-role'] === 'PARENT'
            ? { id: p.id, role: 'PARENT' }
            : actor(t);
        return true;
      },
    })
    .compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  try {
    const family = await request(app.getHttpServer())
      .get('/support/me')
      .set('x-test-role', 'PARENT')
      .expect(200);
    assert(!JSON.stringify(family.body).includes('STAFF-SECRET'));
    await request(app.getHttpServer())
      .post('/support/bookings')
      .set('x-test-role', 'PARENT')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .put('/support/availability')
      .send({
        windows: [
          {
            weekday: 1,
            startMinute: 900,
            endMinute: 1020,
            duration: 60,
            capacity: 1,
            location: 'Room',
          },
        ],
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/support/feedback')
      .send({
        groupId: g.id,
        studentId: students[0].id,
        date: '2026-02-31',
        topic: 'Invalid',
        understanding: 'UNDERSTOOD',
        comment: '',
        privateNote: '',
      })
      .expect(400);
  } finally {
    await app.close();
  }
  console.log(
    'PASS: concurrent capacity, duplicate booking, permissions, private notes, parent scope, timetable and enrollment conflicts, atomic move, time off, results, follow-up, durable notifications, timezone boundaries',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
