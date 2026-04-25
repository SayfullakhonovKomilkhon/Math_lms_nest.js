import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GamificationService } from './gamification.service';

@Processor('gamification')
export class GamificationProcessor extends WorkerHost {
  private readonly logger = new Logger(GamificationProcessor.name);

  constructor(
    private gamificationService: GamificationService,
    @InjectQueue('gamification') private gamificationQueue: Queue,
  ) {
    super();
  }

  @Cron('0 6 1 * *')
  async scheduledMonthlyCalculation() {
    const now = new Date();
    // Calculate for the previous month
    let month = now.getMonth(); // 0-indexed, so current month - 1
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    this.logger.log(`Scheduling monthly achievements for ${month}/${year}`);
    await this.gamificationQueue.add('calculate-monthly', { month, year });
  }

  async process(job: Job) {
    if (job.name === 'calculate-monthly') {
      const { month, year } = job.data as { month: number; year: number };
      this.logger.log(`Calculating monthly achievements for ${month}/${year}`);
      try {
        const result =
          await this.gamificationService.calculateMonthlyAchievements(
            month,
            year,
          );
        this.logger.log(`Awarded ${result.awarded} achievements`);
        return result;
      } catch (err) {
        console.error(
          `[GamificationProcessor] Error processing job ${job.id}:`,
          err,
        );
        throw err;
      }
    }
  }
}
