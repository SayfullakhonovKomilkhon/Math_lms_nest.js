// HTML-шаблоны для пушей в Telegram (parse_mode: 'HTML') и в IN_APP.
// Каждая роль получает свой формат — чтобы родителю было ясно, что речь
// о ребёнке, студенту — что о нём, учителю — что о нём как учителе.
//
// Эмодзи в начале каждого сообщения — единый язык категорий:
//   📚 Урок-напоминание · ✅⏰❌ Посещаемость · 📝 ДЗ
//   💯 Оценка · 💰 Платёж · 📢 Объявление · 💵 Зарплата · 🏆 Достижение
//
// Длина любого сообщения ограничена 4000 символов с многоточием (Telegram
// hard-limit — 4096), что даёт запас на внутренние префиксы.

import { AttendanceStatus, LessonType } from '@prisma/client';

const TG_MAX = 4000;

function clip(text: string): string {
  return text.length > TG_MAX ? `${text.slice(0, TG_MAX - 1)}…` : text;
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU');
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    timeZone: 'Asia/Tashkent',
  });
}

function formatScore(score: number, maxScore: number): string {
  const intLike = Number.isInteger(score) ? String(score) : score.toFixed(2);
  return maxScore === 100 ? intLike : `${intLike}/${formatNumber(maxScore)}`;
}

function lessonTypeLabel(type: LessonType): string {
  switch (type) {
    case LessonType.PRACTICE:
      return 'практика';
    case LessonType.CONTROL:
      return 'контрольная';
    case LessonType.TEST:
      return 'тест';
    case LessonType.REGULAR:
    default:
      return 'занятие';
  }
}

// ── Напоминание об уроке ───────────────────────────────────────────────────

export function lessonReminder(
  groupName: string,
  startTime: string,
  minutesUntil: number,
): string {
  const safeGroup = escape(groupName);
  if (minutesUntil <= 20) {
    return clip(
      `📚 Урок <b>${safeGroup}</b> начинается в ${escape(startTime)} ` +
        `— через ${minutesUntil} мин.`,
    );
  }
  return clip(
    `📚 Через 1 час урок <b>${safeGroup}</b> в ${escape(startTime)}. ` +
      `Не забудьте подготовиться.`,
  );
}

// ── Посещаемость ───────────────────────────────────────────────────────────

const ATTENDANCE_EMOJI: Record<AttendanceStatus, string> = {
  PRESENT: '✅',
  LATE: '⏰',
  ABSENT: '❌',
};

const ATTENDANCE_PARENT_PHRASE: Record<AttendanceStatus, string> = {
  PRESENT: 'был на уроке',
  LATE: 'опоздал на урок',
  ABSENT: 'не пришёл на урок',
};

const ATTENDANCE_SELF_PHRASE: Record<AttendanceStatus, string> = {
  PRESENT: 'отмечен на уроке',
  LATE: 'отмечен как опоздавший на урок',
  ABSENT: 'отмечен как отсутствующий на уроке',
};

export function attendanceForParent(
  studentName: string,
  status: AttendanceStatus,
  groupName: string,
  date: string,
): string {
  return clip(
    `${ATTENDANCE_EMOJI[status]} <b>${escape(studentName)}</b> ` +
      `${ATTENDANCE_PARENT_PHRASE[status]} <b>${escape(groupName)}</b> ` +
      `<i>${formatDate(date)}</i>.`,
  );
}

export function attendanceForStudent(
  status: AttendanceStatus,
  groupName: string,
  date: string,
): string {
  return clip(
    `${ATTENDANCE_EMOJI[status]} Вы ${ATTENDANCE_SELF_PHRASE[status]} ` +
      `<b>${escape(groupName)}</b> <i>${formatDate(date)}</i>.`,
  );
}

// ── Оценки ─────────────────────────────────────────────────────────────────

export function gradeForStudent(
  score: number,
  maxScore: number,
  groupName: string,
  lessonType: LessonType,
): string {
  return clip(
    `💯 Вам поставили <b>${formatScore(score, maxScore)}</b> по ` +
      `<b>${escape(groupName)}</b> (${lessonTypeLabel(lessonType)}).`,
  );
}

export function gradeForParent(
  studentName: string,
  score: number,
  maxScore: number,
  groupName: string,
  lessonType: LessonType,
): string {
  return clip(
    `💯 <b>${escape(studentName)}</b> получил оценку ` +
      `<b>${formatScore(score, maxScore)}</b> по ` +
      `<b>${escape(groupName)}</b> (${lessonTypeLabel(lessonType)}).`,
  );
}

// ── Домашнее задание ───────────────────────────────────────────────────────

function dueLine(dueDate: Date | null): string {
  if (!dueDate) return '';
  return ` Сдать до <i>${formatDate(dueDate)}</i>.`;
}

export function homeworkForStudent(
  teacherName: string,
  groupName: string,
  dueDate: Date | null,
): string {
  return clip(
    `📝 Новое домашнее задание по <b>${escape(groupName)}</b> ` +
      `от ${escape(teacherName)}.${dueLine(dueDate)}`,
  );
}

export function homeworkForParent(
  studentName: string,
  teacherName: string,
  groupName: string,
  dueDate: Date | null,
): string {
  return clip(
    `📝 У <b>${escape(studentName)}</b> новое ДЗ по ` +
      `<b>${escape(groupName)}</b> от ${escape(teacherName)}.` +
      `${dueLine(dueDate)}`,
  );
}

// ── Платежи ────────────────────────────────────────────────────────────────

export function paymentForStudent(daysLeft: number, amount: number): string {
  if (daysLeft < 0) {
    return clip(
      `💰 Срок оплаты прошёл ${Math.abs(daysLeft)} дн. назад. ` +
        `Сумма: <b>${formatNumber(amount)} сум</b>.`,
    );
  }
  return clip(
    `💰 До оплаты осталось <b>${daysLeft}</b> дн. ` +
      `Сумма: <b>${formatNumber(amount)} сум</b>.`,
  );
}

export function paymentForParent(
  studentName: string,
  daysLeft: number,
  amount: number,
): string {
  if (daysLeft < 0) {
    return clip(
      `💰 Срок оплаты за <b>${escape(studentName)}</b> прошёл ` +
        `${Math.abs(daysLeft)} дн. назад. ` +
        `Сумма: <b>${formatNumber(amount)} сум</b>.`,
    );
  }
  return clip(
    `💰 До оплаты за <b>${escape(studentName)}</b> осталось ` +
      `<b>${daysLeft}</b> дн. Сумма: <b>${formatNumber(amount)} сум</b>.`,
  );
}

export function paymentReceiptStatus(
  status: 'CONFIRMED' | 'REJECTED',
  reason?: string,
): string {
  if (status === 'CONFIRMED') {
    return clip('💰 Ваш чек об оплате <b>подтверждён</b> ✅');
  }
  const tail = reason ? ` Причина: <i>${escape(reason)}</i>` : '';
  return clip(`💰 Ваш чек об оплате <b>отклонён</b> ❌.${tail}`);
}

// ── Зарплата ───────────────────────────────────────────────────────────────

export function salaryRateUpdated(oldRate: number, newRate: number): string {
  const diff = newRate - oldRate;
  const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '↔️';
  return clip(
    `💵 Ставка за студента обновлена: ` +
      `<b>${formatNumber(oldRate)} → ${formatNumber(newRate)} сум</b> ${arrow}`,
  );
}

// ── Объявления ─────────────────────────────────────────────────────────────

export function announcement(
  title: string,
  message: string,
  scope: 'group' | 'center',
): string {
  const scopeLabel =
    scope === 'group' ? 'Объявление группе' : 'Объявление центра';
  return clip(
    `📢 <b>${escape(scopeLabel)}: ${escape(title)}</b>\n\n${escape(message)}`,
  );
}

// ── Достижения ─────────────────────────────────────────────────────────────

export function achievementForStudent(title: string, icon: string): string {
  return clip(
    `🏆 Новое достижение: <b>${escape(title)}</b> ${escape(icon)}`,
  );
}

export function achievementForParent(
  studentName: string,
  title: string,
  icon: string,
): string {
  return clip(
    `🏆 <b>${escape(studentName)}</b> получил новое достижение: ` +
      `<b>${escape(title)}</b> ${escape(icon)}`,
  );
}
