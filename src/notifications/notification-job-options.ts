import { JobsOptions } from 'bullmq';

export const NOTIFICATION_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: 500,
  removeOnFail: 1_000,
};
