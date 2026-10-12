import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export type NotificationType = 'SHIFT_CHANGE' | 'SWAP_REQUEST' | 'BILLING';

export interface EnqueueNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isUrgent?: boolean;
}

export const notificationQueue = new Queue<EnqueueNotificationPayload>(
  'notifications',
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  }
);

/**
 * Enqueues a notification job into the BullMQ notifications queue.
 */
export async function enqueueNotification(
  payload: EnqueueNotificationPayload,
  opts?: { delay?: number }
): Promise<string> {
  const job = await notificationQueue.add('send-notification', payload, {
    delay: opts?.delay
  });
  return job.id || `job_${Date.now()}`;
}
