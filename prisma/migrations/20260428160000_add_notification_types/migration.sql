-- AlterEnum: расширяем NotificationType новыми типами уведомлений,
-- которые рассылает Telegram-бот: напоминание об уроке, оценка, зарплата.
ALTER TYPE "NotificationType" ADD VALUE 'LESSON_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'GRADE';
ALTER TYPE "NotificationType" ADD VALUE 'SALARY';
