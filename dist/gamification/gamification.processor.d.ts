import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { GamificationService } from './gamification.service';
export declare class GamificationProcessor extends WorkerHost {
    private gamificationService;
    private gamificationQueue;
    private readonly logger;
    constructor(gamificationService: GamificationService, gamificationQueue: Queue);
    scheduledMonthlyCalculation(): Promise<void>;
    process(job: Job): Promise<{
        month: number;
        year: number;
        awarded: number;
        results: {
            studentId: string;
            place: number;
            title: string;
            icon: string;
        }[];
    } | undefined>;
}
