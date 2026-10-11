---
name: manage-bullmq-notifications
description: Runbook for asynchronous BullMQ queue architecture, timezone-aware midnight-spanning quiet hours evaluation, and push digest consolidation.
version: 1.0.0
---

# Manage BullMQ Notifications Skill

## 1. Context & Purpose
This skill manages asynchronous background jobs in Rota. It guarantees that the synchronous Express HTTP cycle remains fast and unblocked ($< 1.5\text{s}$ response time) while preventing worker notification fatigue through timezone-aware quiet hours evaluation and consolidated morning digests.

---

## 2. Invariants & Notification Guardrails

- **Zero Synchronous Push Calls**: Never call Expo Push APIs directly inside Express routes or controllers. All pushes must be enqueued as BullMQ jobs.
- **Fast Webhook Ingress**: Webhooks must verify cryptographic signatures, enqueue a BullMQ job, and return HTTP `200 OK` within 1.5 seconds.
- **Timezone-Aware Midnight Crossing**: Quiet hours evaluation must parse the user's stored IANA timezone string using `date-fns-tz` and correctly handle windows that span past midnight (e.g., `22:00` to `07:00`).
- **Consolidated Digests**: Non-urgent alerts occurring during quiet hours must be aggregated in Redis and dispatched as a single summary at `quietHoursEnd`.
- **Urgent Critical Override**: Shifts cancelled less than 2 hours before scheduled start time must bypass quiet hours with `priority: HIGH`.

---

## 3. Queue Setup & Producers

In `server/src/queues/notification.queue.ts`:

```typescript
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface PushNotificationJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  urgency: 'NORMAL' | 'CRITICAL';
  createdAt: string;
}

export const notificationQueue = new Queue<PushNotificationJobData>(
  'notification-digest',
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    }
  }
);

export async function enqueueNotification(payload: PushNotificationJobData): Promise<void> {
  await notificationQueue.add('send-notification', payload);
}
```

---

## 4. Timezone-Aware Quiet Hours Evaluation Logic

In `server/src/utils/quiet-hours.ts`:

```typescript
import { toZonedTime, format } from 'date-fns-tz';
import { parseISO, setHours, setMinutes, setSeconds, addDays, differenceInMilliseconds } from 'date-fns';

export interface QuietHoursConfig {
  timezone: string; // IANA, e.g., 'America/New_York'
  enabled: boolean;
  startStr: string; // "22:00"
  endStr: string;   // "07:00"
}

export function isWithinQuietHours(now: Date, config: QuietHoursConfig): boolean {
  if (!config.enabled) return false;

  const userLocalTime = toZonedTime(now, config.timezone);
  const currentHHmm = format(userLocalTime, 'HH:mm');

  if (config.startStr > config.endStr) {
    // Spans midnight (e.g., 22:00 to 07:00)
    return currentHHmm >= config.startStr || currentHHmm < config.endStr;
  } else {
    // Standard window within the same calendar day (e.g., 13:00 to 15:00)
    return currentHHmm >= config.startStr && currentHHmm < config.endStr;
  }
}

export function calculateDelayUntilQuietEnd(now: Date, config: QuietHoursConfig): number {
  const userLocalTime = toZonedTime(now, config.timezone);
  const [endHour, endMin] = config.endStr.split(':').map(Number);

  let targetEndDate = setSeconds(setMinutes(setHours(userLocalTime, endHour), endMin), 0);

  // If local time is already past endStr today (e.g., current is 23:00, end is 07:00), end date is tomorrow morning
  if (userLocalTime >= targetEndDate) {
    targetEndDate = addDays(targetEndDate, 1);
  }

  const delayMs = differenceInMilliseconds(targetEndDate, userLocalTime);
  return Math.max(delayMs, 1000);
}
```

---

## 5. BullMQ Worker with Digest Consolidation

In `server/src/workers/notification.worker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { isWithinQuietHours, calculateDelayUntilQuietEnd } from '../utils/quiet-hours';
import { sendExpoPushDirect } from '../services/expo-push.service';

export function createNotificationWorker(prisma: PrismaClient, redis: Redis) {
  return new Worker(
    'notification-digest',
    async (job: Job) => {
      // 1. Check if job is a scheduled morning digest trigger
      if (job.name === 'morning-digest-dispatch') {
        const { userId } = job.data;
        const queueKey = `user:${userId}:quiet_digest_queue`;

        const pendingItems = await redis.lrange(queueKey, 0, -1);
        if (pendingItems.length === 0) return;

        await redis.del(queueKey);

        const count = pendingItems.length;
        await sendExpoPushDirect(prisma, {
          userId,
          title: 'Rota Schedule Updates',
          body: `You have ${count} schedule update${count > 1 ? 's' : ''} for this week.`
        });
        return;
      }

      // 2. Standard notification processing
      const { userId, title, body, urgency } = job.data;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          timezone: true,
          quietHoursEnabled: true,
          quietHoursStart: true,
          quietHoursEnd: true
        }
      });

      if (!user) return;

      const now = new Date();
      const isQuiet = isWithinQuietHours(now, {
        timezone: user.timezone,
        enabled: user.quietHoursEnabled,
        startStr: user.quietHoursStart,
        endStr: user.quietHoursEnd
      });

      // Urgent critical override or daytime delivery
      if (!isQuiet || urgency === 'CRITICAL') {
        await sendExpoPushDirect(prisma, { userId, title, body });
        return;
      }

      // During Quiet Hours: Consolidate into Redis and schedule morning wake-up job
      const queueKey = `user:${userId}:quiet_digest_queue`;
      await redis.rpush(queueKey, JSON.stringify(job.data));

      const delayMs = calculateDelayUntilQuietEnd(now, {
        timezone: user.timezone,
        enabled: user.quietHoursEnabled,
        startStr: user.quietHoursStart,
        endStr: user.quietHoursEnd
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const digestJobId = `quiet_digest_${userId}_${todayStr}`;

      // Enqueue single scheduled morning digest with deduplication
      await job.queue.add(
        'morning-digest-dispatch',
        { userId },
        { delay: delayMs, jobId: digestJobId }
      );
    },
    { connection: redisConnection, concurrency: 10 }
  );
}
```

---

## 6. Webhook Worker & Length-Safe Signature Ingress

In `server/src/workers/webhook.worker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { appendLedgerEntry } from '../services/ledger.service';

export function createWebhookWorker(prisma: PrismaClient) {
  return new Worker(
    'billing-webhooks',
    async (job: Job) => {
      const { tx_ref, amount, status, teamId, subscriptionId } = job.data;

      if (status !== 'successful') return;

      // Ensure idempotency via database ledger check
      const existing = await prisma.subscriptionLedger.findFirst({
        where: { flutterwaveTxRef: tx_ref }
      });

      if (existing) return; // already processed

      await appendLedgerEntry(prisma, {
        teamId,
        subscriptionId,
        entryType: 'MONTHLY_RENEWAL',
        direction: 'DEBIT',
        amountCents: Math.floor(amount * 100), // convert to integer cents
        description: `Flutterwave Renewal - Ref: ${tx_ref}`,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400 * 1000),
        flutterwaveTxRef: tx_ref,
        idempotencyKey: `fw_sub_${tx_ref}`
      });
    },
    { connection: redisConnection }
  );
}
```

---

## 7. Verification Checklist

1. **Quiet Hours Suppression**: Publish 5 shifts to a user located in London (`Europe/London`) at 23:30 local time. Verify zero pushes are delivered immediately and Redis queue contains 5 items.
2. **Morning Wakeup Digest**: Fast-forward worker to 07:00 AM local time. Verify exactly 1 consolidated push arrives: *"Rota Schedule Updates: You have 5 schedule updates for this week."*
3. **Emergency Bypass**: Trigger a shift cancellation $< 2$ hours before start with `urgency: 'CRITICAL'`. Verify immediate push delivery despite quiet hours.
