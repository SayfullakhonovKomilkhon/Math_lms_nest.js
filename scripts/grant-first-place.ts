/**
 * One-off helper to grant a 1-st place monthly achievement to the user
 * `student@math.com` so the celebration animation fires when they next
 * open the achievements page (or their parent does).
 *
 * Usage:
 *   cd mathcenter-backend
 *   npx ts-node scripts/grant-first-place.ts            # current month
 *   npx ts-node scripts/grant-first-place.ts 5 2026     # specific month/year
 *
 * Safe to re-run: uses prisma `upsert` and won't duplicate the achievement.
 */
import { PrismaClient, AchievementType, Gender, NotificationType } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getTitleForStudent } from '../src/gamification/achievements.config';

const TARGET_PHONE = '+998900000010';

async function main() {
  const month = Number(process.argv[2] ?? new Date().getMonth() + 1);
  const year = Number(process.argv[3] ?? new Date().getFullYear());

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${process.argv[2]}`);
  }
  if (!Number.isInteger(year) || year < 2020) {
    throw new Error(`Invalid year: ${process.argv[3]}`);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { phone: TARGET_PHONE },
      select: {
        id: true,
        phone: true,
        student: {
          select: { id: true, fullName: true, gender: true },
        },
      },
    });

    if (!user) throw new Error(`User not found: ${TARGET_PHONE}`);
    if (!user.student)
      throw new Error(`User ${TARGET_PHONE} has no linked student profile`);

    const gender: 'MALE' | 'FEMALE' =
      user.student.gender === Gender.FEMALE ? 'FEMALE' : 'MALE';
    const titleData = getTitleForStudent(month, 1, gender);
    if (!titleData) throw new Error(`No title data for month=${month} place=1`);

    const studentId = user.student.id;

    const existing = await prisma.achievement.findUnique({
      where: {
        studentId_type_month_year: {
          studentId,
          type: AchievementType.MONTHLY,
          month,
          year,
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.achievement.upsert({
        where: {
          studentId_type_month_year: {
            studentId,
            type: AchievementType.MONTHLY,
            month,
            year,
          },
        },
        create: {
          studentId,
          type: AchievementType.MONTHLY,
          month,
          year,
          place: 1,
          title: titleData.title,
          icon: titleData.icon,
          description: titleData.description,
        },
        update: {
          place: 1,
          title: titleData.title,
          icon: titleData.icon,
          description: titleData.description,
        },
      });

      if (!existing) {
        await tx.notification.create({
          data: {
            userId: user.id,
            type: NotificationType.ACHIEVEMENT,
            message: `🏆 Новое достижение: ${titleData.title} ${titleData.icon}`,
            isRead: false,
          },
        });

        const parentLinks = await tx.parentStudent.findMany({
          where: { studentId },
          select: { parent: { select: { userId: true } } },
        });
        for (const link of parentLinks) {
          if (!link.parent?.userId) continue;
          await tx.notification.create({
            data: {
              userId: link.parent.userId,
              type: NotificationType.ACHIEVEMENT,
              message: `🏆 ${user.student!.fullName} получил(а) новое достижение: ${titleData.title} ${titleData.icon}`,
              isRead: false,
            },
          });
        }
      }
    });

    const verb = existing ? 'Updated' : 'Granted';
    console.log(
      `${verb} ${month}/${year} medal "${titleData.title}" ${titleData.icon} ` +
        `(1st place, ${gender}) to ${user.student.fullName} <${TARGET_PHONE}>.`,
    );
    console.log(
      'Open the student panel — the celebration should fire automatically.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
