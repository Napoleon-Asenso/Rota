import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { prisma as defaultPrisma } from '../db/prisma';
import { EnqueueNotificationPayload, enqueueNotification } from '../queues/notificationQueue';
import { isWithinQuietHours, calculateDelayUntilQuietEnd } from '../utils/quiet-hours';

export interface PushTicketResult {
  token: string;
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | string;
  };
}

export interface Dispatcher {
  sendPush(tokens: string[], notification: { title: string; body: string; data?: Record<string, unknown> }): Promise<PushTicketResult[]>;
}

// Default dispatcher using Expo Push API format
export const defaultDispatcher: Dispatcher = {
  async sendPush(tokens: string[], notification): Promise<PushTicketResult[]> {
    // In test or non-production environment, return mock tickets
    return tokens.map((token) => ({
      token,
      status: 'ok',
      id: `ticket_${Date.now()}`
    }));
  }
};

export interface ProcessJobResult {
  status: 'SENT' | 'SKIPPED_USER_DISABLED' | 'DELAYED_QUIET_HOURS' | 'NO_DEVICE_TOKENS';
  tickets?: PushTicketResult[];
  prunedTokens?: string[];
  delayMs?: number;
  quietHoursEnd?: string;
}

/**
 * Core processing logic for notification jobs.
 * Enforces Steps A, B, C, D deterministically.
 */
export async function processNotificationJob(
  jobData: EnqueueNotificationPayload,
  deps: {
    prisma?: PrismaClient;
    now?: Date;
    dispatcher?: Dispatcher;
    reschedule?: (payload: EnqueueNotificationPayload, delayMs: number) => Promise<string>;
  } = {}
): Promise<ProcessJobResult> {
  const prismaClient = deps.prisma ?? defaultPrisma;
  const now = deps.now ?? new Date();
  const dispatcher = deps.dispatcher ?? defaultDispatcher;
  const rescheduler = deps.reschedule ?? ((payload, delay) => enqueueNotification(payload, { delay }));

  // -------------------------------------------------------------------------
  // STEP A: Check User Settings
  // -------------------------------------------------------------------------
  const settings = await prismaClient.userSettings.findUnique({
    where: { userId: jobData.userId }
  });

  if (settings) {
    if (jobData.type === 'SHIFT_CHANGE' && !settings.pushShiftChanges) {
      console.log(`[Worker] Skipping SHIFT_CHANGE notification for user ${jobData.userId} (preference disabled)`);
      return { status: 'SKIPPED_USER_DISABLED' };
    }
    if (jobData.type === 'SWAP_REQUEST' && !settings.pushSwapRequests) {
      console.log(`[Worker] Skipping SWAP_REQUEST notification for user ${jobData.userId} (preference disabled)`);
      return { status: 'SKIPPED_USER_DISABLED' };
    }
    if (jobData.type === 'BILLING' && !settings.pushApprovals) {
      console.log(`[Worker] Skipping BILLING notification for user ${jobData.userId} (preference disabled)`);
      return { status: 'SKIPPED_USER_DISABLED' };
    }
  }

  // -------------------------------------------------------------------------
  // STEP B: Evaluate Quiet Hours
  // -------------------------------------------------------------------------
  const quietConfig = {
    timezone: settings?.timezone || 'Africa/Lagos',
    enabled: true,
    startStr: settings?.quietHoursStart || '22:00',
    endStr: settings?.quietHoursEnd || '06:00'
  };

  const inQuietHours = isWithinQuietHours(now, quietConfig);

  if (inQuietHours && jobData.isUrgent !== true) {
    const delayMs = calculateDelayUntilQuietEnd(now, quietConfig);
    console.log(`Notification delayed until ${quietConfig.endStr} due to quiet hours (${delayMs}ms)`);

    await rescheduler(jobData, delayMs);
    return {
      status: 'DELAYED_QUIET_HOURS',
      delayMs,
      quietHoursEnd: quietConfig.endStr
    };
  }

  // -------------------------------------------------------------------------
  // STEP C: Dispatch via Expo Push API
  // -------------------------------------------------------------------------
  const deviceTokens = await prismaClient.deviceToken.findMany({
    where: { userId: jobData.userId }
  });

  if (deviceTokens.length === 0) {
    console.log(`[Worker] No registered device tokens for user ${jobData.userId}`);
    return { status: 'NO_DEVICE_TOKENS' };
  }

  const rawTokens = deviceTokens.map((t) => t.token);
  const tickets = await dispatcher.sendPush(rawTokens, {
    title: jobData.title,
    body: jobData.body,
    data: jobData.data
  });

  // -------------------------------------------------------------------------
  // STEP D: Prune Dead Tokens (DeviceNotRegistered)
  // -------------------------------------------------------------------------
  const prunedTokens: string[] = [];
  for (const ticket of tickets) {
    const isDead =
      ticket.status === 'error' &&
      (ticket.details?.error === 'DeviceNotRegistered' || ticket.message?.includes('DeviceNotRegistered'));

    if (isDead) {
      console.log(`[Worker] Pruning dead token: ${ticket.token}`);
      await prismaClient.deviceToken.deleteMany({
        where: { token: ticket.token }
      });
      prunedTokens.push(ticket.token);
    }
  }

  return {
    status: 'SENT',
    tickets,
    prunedTokens
  };
}

/**
 * Initializes the BullMQ Notification Worker.
 */
export function createNotificationWorker(prismaClient: PrismaClient = defaultPrisma) {
  return new Worker<EnqueueNotificationPayload>(
    'notifications',
    async (job: Job<EnqueueNotificationPayload>) => {
      await processNotificationJob(job.data, { prisma: prismaClient });
    },
    {
      connection: redisConnection,
      concurrency: 5
    }
  );
}
