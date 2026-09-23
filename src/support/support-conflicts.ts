import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { clashesWithSchedule } from './support-time';
// Caller must hold the same transaction advisory lock as support bookings.
export async function assertNoSupportConflict(
  db: Prisma.TransactionClient,
  schedule: unknown,
  teacherId?: string,
  studentIds: string[] = [],
) {
  const bookings = await db.supportBooking.findMany({
    where: {
      status: 'BOOKED',
      session: { endAt: { gt: new Date() } },
      OR: [
        ...(teacherId ? [{ session: { teacherId } }] : []),
        ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
      ],
    },
    include: { session: true },
  });
  if (
    bookings.some((b) =>
      clashesWithSchedule(schedule, b.session.startAt, b.session.endAt),
    )
  )
    throw new ConflictException(
      'Основное расписание пересекается с записью к суппорту. Сначала перенесите дополнительное занятие.',
    );
}
