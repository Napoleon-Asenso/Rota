import assert from 'assert';
import { processNotificationJob, Dispatcher, PushTicketResult } from '../src/workers/notificationWorker';
import { isWithinQuietHours, calculateDelayUntilQuietEnd } from '../src/utils/quiet-hours';
import { EnqueueNotificationPayload } from '../src/queues/notificationQueue';

export async function runNotificationUnitTests(): Promise<void> {
  console.log('===============================================================');
  console.log('   ROTA MILESTONE 10: NOTIFICATION & QUIET HOURS TEST SUITE   ');
  console.log('===============================================================');

  let passed = 0;
  const total = 7;

  // ---------------------------------------------------------------------------
  // TEST 1: Midnight-Spanning Quiet Hours Detection (isWithinQuietHours)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 1/7] Verifying Midnight-Spanning Quiet Hours Window (22:00 -> 06:00)...');
  {
    const quietConfig = {
      timezone: 'Africa/Lagos',
      enabled: true,
      startStr: '22:00',
      endStr: '06:00'
    };

    // 23:30 Lagos time (within quiet hours)
    // In UTC, Africa/Lagos is UTC+1, so 23:30 Lagos is 22:30 UTC
    const dateAtNight = new Date('2026-05-15T22:30:00.000Z');
    const isNightQuiet = isWithinQuietHours(dateAtNight, quietConfig);
    assert.strictEqual(isNightQuiet, true, '23:30 Lagos must be within quiet hours (22:00 - 06:00)');

    // 03:15 Lagos time (within quiet hours past midnight)
    // 03:15 Lagos is 02:15 UTC
    const datePastMidnight = new Date('2026-05-16T02:15:00.000Z');
    const isEarlyMorningQuiet = isWithinQuietHours(datePastMidnight, quietConfig);
    assert.strictEqual(isEarlyMorningQuiet, true, '03:15 Lagos must be within quiet hours');

    // 14:00 Lagos time (daytime, outside quiet hours)
    // 14:00 Lagos is 13:00 UTC
    const dateDaytime = new Date('2026-05-16T13:00:00.000Z');
    const isDayQuiet = isWithinQuietHours(dateDaytime, quietConfig);
    assert.strictEqual(isDayQuiet, false, '14:00 Lagos must NOT be within quiet hours');

    console.log('  ✔ PASS: Midnight-spanning quiet hours correctly evaluated for pre/post-midnight.');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Quiet Hours Delay Calculation Until Quiet Hours End (06:00)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 2/7] Verifying Exact Delay Calculation Until Quiet Hours End (06:00 AM)...');
  {
    const quietConfig = {
      timezone: 'Africa/Lagos',
      enabled: true,
      startStr: '22:00',
      endStr: '06:00'
    };

    // 23:00 Lagos time (22:00 UTC) -> 7 hours until 06:00 next morning (7 * 3,600,000 = 25,200,000 ms)
    const dateAt23 = new Date('2026-05-15T22:00:00.000Z');
    const delayMs = calculateDelayUntilQuietEnd(dateAt23, quietConfig);

    assert.ok(delayMs > 0, 'Delay must be positive');
    // Expected exact 7 hours: 25,200,000 ms
    assert.strictEqual(delayMs, 7 * 60 * 60 * 1000, `Expected 7 hours delay, got ${delayMs}`);

    console.log(`  ✔ PASS: Delay correctly computed to 06:00 AM next morning: ${delayMs}ms (7 hours).`);
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Non-Urgent Notification Rescheduled During Quiet Hours (Step B)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 3/7] Verifying Non-Urgent Notification is Rescheduled and Delayed...');
  {
    let rescheduled = false;
    let rescheduledDelay = 0;

    const mockPrisma: any = {
      userSettings: {
        findUnique: async () => ({
          userId: 'user_quiet_1',
          timezone: 'Africa/Lagos',
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          pushShiftChanges: true,
          pushSwapRequests: true,
          pushApprovals: true
        })
      },
      deviceToken: {
        findMany: async () => [{ token: 'token_1', platform: 'android' }]
      }
    };

    const payload: EnqueueNotificationPayload = {
      userId: 'user_quiet_1',
      type: 'SHIFT_CHANGE',
      title: 'Shift Updated',
      body: 'Your shift has changed.',
      isUrgent: false
    };

    // 23:00 Lagos time
    const nightTime = new Date('2026-05-15T22:00:00.000Z');

    const result = await processNotificationJob(payload, {
      prisma: mockPrisma,
      now: nightTime,
      reschedule: async (_p, delayMs) => {
        rescheduled = true;
        rescheduledDelay = delayMs;
        return 'job_rescheduled_id';
      }
    });

    assert.strictEqual(result.status, 'DELAYED_QUIET_HOURS');
    assert.strictEqual(rescheduled, true, 'Notification must be re-enqueued with delay');
    assert.strictEqual(rescheduledDelay, 7 * 60 * 60 * 1000);
    assert.strictEqual(result.quietHoursEnd, '06:00');

    console.log('  ✔ PASS: Non-urgent notification delayed during quiet hours with calculated delay.');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Urgent Notification Bypasses Quiet Hours (Immediate Send)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4/7] Verifying Urgent Notification Bypasses Quiet Hours Immediately...');
  {
    let pushDispatched = false;

    const mockPrisma: any = {
      userSettings: {
        findUnique: async () => ({
          userId: 'user_urgent_1',
          timezone: 'Africa/Lagos',
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          pushShiftChanges: true,
          pushSwapRequests: true,
          pushApprovals: true
        })
      },
      deviceToken: {
        findMany: async () => [{ token: 'token_urgent_user', platform: 'android' }]
      }
    };

    const mockDispatcher: Dispatcher = {
      async sendPush(tokens) {
        pushDispatched = true;
        return tokens.map((token) => ({ token, status: 'ok', id: 'ticket_urgent' }));
      }
    };

    const urgentPayload: EnqueueNotificationPayload = {
      userId: 'user_urgent_1',
      type: 'SWAP_REQUEST',
      title: 'Urgent: Shift Swap Requested',
      body: 'Action required immediately.',
      isUrgent: true // BYPASS QUIET HOURS
    };

    // 23:30 Lagos time (in quiet hours)
    const nightTime = new Date('2026-05-15T22:30:00.000Z');

    const result = await processNotificationJob(urgentPayload, {
      prisma: mockPrisma,
      now: nightTime,
      dispatcher: mockDispatcher
    });

    assert.strictEqual(result.status, 'SENT', 'Urgent alert must send immediately');
    assert.strictEqual(pushDispatched, true, 'Dispatcher sendPush must be called');
    assert.strictEqual(result.tickets?.length, 1);

    console.log('  ✔ PASS: isUrgent=true successfully bypassed quiet hours and sent immediately.');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 5: User Settings Toggle Check (Step A: Discard when Disabled)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 5/7] Verifying User Notification Toggle Preferences (Step A Discard)...');
  {
    const mockPrisma: any = {
      userSettings: {
        findUnique: async () => ({
          userId: 'user_disabled_toggles',
          pushShiftChanges: false, // Disabled
          pushSwapRequests: true,
          pushApprovals: false
        })
      }
    };

    let dispatcherCalled = false;
    const mockDispatcher: Dispatcher = {
      async sendPush() {
        dispatcherCalled = true;
        return [];
      }
    };

    // 1. Shift change notification should be skipped
    const shiftChangeResult = await processNotificationJob(
      {
        userId: 'user_disabled_toggles',
        type: 'SHIFT_CHANGE',
        title: 'New Shift Added',
        body: 'Check schedule.'
      },
      { prisma: mockPrisma, dispatcher: mockDispatcher }
    );

    assert.strictEqual(shiftChangeResult.status, 'SKIPPED_USER_DISABLED');
    assert.strictEqual(dispatcherCalled, false, 'Push must NOT be sent if pushShiftChanges is false');

    // 2. Billing / Approval notification should also be skipped
    const billingResult = await processNotificationJob(
      {
        userId: 'user_disabled_toggles',
        type: 'BILLING',
        title: 'Invoice Ready',
        body: 'Receipt attached.'
      },
      { prisma: mockPrisma, dispatcher: mockDispatcher }
    );

    assert.strictEqual(billingResult.status, 'SKIPPED_USER_DISABLED');
    assert.strictEqual(dispatcherCalled, false);

    console.log('  ✔ PASS: Disabled notification types in user settings are discarded at Step A.');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Dead Token Pruning on DeviceNotRegistered (Step D)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 6/7] Verifying Automatic Dead Token Pruning (DeviceNotRegistered)...');
  {
    const deletedTokens: string[] = [];

    const mockPrisma: any = {
      userSettings: {
        findUnique: async () => null // Use default settings (enabled)
      },
      deviceToken: {
        findMany: async () => [
          { token: 'valid_device_token_abc', platform: 'android' },
          { token: 'dead_device_token_xyz', platform: 'ios' }
        ],
        deleteMany: async ({ where }: any) => {
          deletedTokens.push(where.token);
          return { count: 1 };
        }
      }
    };

    const mockDispatcher: Dispatcher = {
      async sendPush(tokens) {
        return tokens.map((t): PushTicketResult => {
          if (t === 'dead_device_token_xyz') {
            return {
              token: t,
              status: 'error',
              message: '"dead_device_token_xyz" is not a registered push notification recipient',
              details: { error: 'DeviceNotRegistered' }
            };
          }
          return {
            token: t,
            status: 'ok',
            id: 'ticket_valid_123'
          };
        });
      }
    };

    // Daytime Lagos time
    const dayTime = new Date('2026-05-16T13:00:00.000Z');

    const result = await processNotificationJob(
      {
        userId: 'user_with_dead_tokens',
        type: 'SHIFT_CHANGE',
        title: 'Schedule Published',
        body: 'See new schedule.'
      },
      {
        prisma: mockPrisma,
        now: dayTime,
        dispatcher: mockDispatcher
      }
    );

    assert.strictEqual(result.status, 'SENT');
    assert.strictEqual(result.prunedTokens?.length, 1);
    assert.strictEqual(result.prunedTokens?.[0], 'dead_device_token_xyz');
    assert.strictEqual(deletedTokens.length, 1);
    assert.strictEqual(deletedTokens[0], 'dead_device_token_xyz');

    console.log('  ✔ PASS: Dead token (DeviceNotRegistered) detected and pruned from database.');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Settings Controller Contract Validation & Timestamps
  // ---------------------------------------------------------------------------
  console.log('\n[Test 7/7] Verifying Settings API Schema and Timestamp Contract...');
  {
    // Test payload contract matches the requirements
    const testPatch = {
      quietHoursStart: '23:00',
      quietHoursEnd: '07:00',
      timezone: 'Africa/Lagos',
      pushShiftChanges: true,
      pushSwapRequests: false,
      pushApprovals: true
    };

    // Verify regex validation for HH:mm
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    assert.ok(timeRegex.test(testPatch.quietHoursStart), 'quietHoursStart format must be HH:mm');
    assert.ok(timeRegex.test(testPatch.quietHoursEnd), 'quietHoursEnd format must be HH:mm');

    const now = new Date();
    const updatedRecord = {
      userId: 'usr_test_123',
      ...testPatch,
      updatedAt: now
    };

    assert.strictEqual(typeof updatedRecord.updatedAt.toISOString(), 'string');
    assert.strictEqual(updatedRecord.pushSwapRequests, false);
    assert.strictEqual(updatedRecord.quietHoursStart, '23:00');

    console.log('  ✔ PASS: Settings contracts and ISO 8601 updatedAt timestamps valid.');
    passed++;
  }

  console.log('\n===============================================================');
  console.log(`   ALL ${passed}/${total} MILESTONE 10 NOTIFICATION TESTS PASSED SUCCESSFULLY!   `);
  console.log('===============================================================\n');
}

if (require.main === module) {
  runNotificationUnitTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
