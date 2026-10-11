---
trigger: glob
---

# Rule: Asynchronous Queues, BullMQ & Notification Workflows
**Scope**: BullMQ Workers (`/server/src/workers`), Job Producers (`/server/src/queues`), and Notification Gateways  
**Authority**: Mandatory Governance (Enforced in Antigravity)

---

## 1. Core Principle
Synchronous notification dispatch and long-running webhook processing in the HTTP cycle degrade API availability and cause request timeouts. Furthermore, un-gated off-hours push notifications disrupt frontline healthcare and service workers. Notifications must be asynchronous, timezone-aware, and consolidated during quiet hours.

---

## 2. Zero Synchronous Workflows in HTTP Requests

1. **Mandatory Asynchronous Offloading**:
   - Webhook endpoints (`/api/v1/billing/webhooks`) and push triggers (shift publish, swap approvals) MUST NOT deliver push notifications or process downstream domain side-effects in the synchronous HTTP cycle.
   - Flow: Verify signature/payload -> Enqueue BullMQ job -> Return HTTP `200 OK` within 1.5 seconds.
   - Never call Expo Push APIs directly from Express route handlers or services.

2. **Dedicated Queue Topology**:
   - Queues must use BullMQ (v5+) backed by Upstash-compatible Redis:
     - `'notification-digest'`: Push notification jobs and quiet hours consolidation.
     - `'billing-webhooks'`: Flutterwave incoming webhook settlement and ledger logging.
     - `'audit-events'`: High-throughput activity feed recording.

---

## 3. Timezone-Aware Quiet Hours & Midnight-Crossing Logic

1. **User Profile Timezone Resolution**:
   - Each worker's local time $T_{\text{local}}$ must be resolved using `date-fns-tz` against the user's stored IANA timezone string (`user.timezone`, e.g., `"America/New_York"` or `"Africa/Lagos"`).

2. **Midnight-Crossing Window Evaluation**:
   - Quiet hours are defined by `user.quietHoursStart` (e.g., `"22:00"`) and `user.quietHoursEnd` (e.g., `"07:00"`).
   - The worker must evaluate:
     ```typescript
     export function isWithinQuietHours(
       now: Date,
       timezone: string,
       startStr: string, // "22:00"
       endStr: string    // "07:00"
     ): boolean {
       const userLocalTime = toZonedTime(now, timezone);
       const currentHHmm = format(userLocalTime, "HH:mm");

       if (startStr > endStr) {
         // Spans midnight (e.g., 22:00 to 07:00)
         return currentHHmm >= startStr || currentHHmm < endStr;
       } else {
         // Daytime quiet window (e.g., 13:00 to 15:00)
         return currentHHmm >= startStr && currentHHmm < endStr;
       }
     }
     ```

---

## 4. Digest Consolidation Architecture

1. **Quiet Hours Suppression for `NORMAL` Urgency**:
   - If `isQuiet = true` and `urgency === "NORMAL"`:
     1. Append notification item to Redis list: `user:{userId}:quiet_digest_queue`.
     2. Enqueue a delayed BullMQ digest job scheduled for user's `quietHoursEnd` timestamp:
        - Job ID: `quiet_digest_${userId}_${targetDateString}` (deduplication ensures only 1 wake-up job is scheduled per user/day).
     3. Suppress immediate push notification dispatch.

2. **Consolidated Morning Digest Dispatch**:
   - When the scheduled digest job executes at `quietHoursEnd`:
     1. Pop all items from `user:{userId}:quiet_digest_queue`.
     2. Count pending items $N$.
     3. Dispatch a single consolidated notification via Expo Push:
        `"Rota: You have ${N} schedule updates for this week."`

3. **Critical Bypass Override**:
   - If `urgency === "CRITICAL"` (e.g., shift cancelled less than 2 hours before scheduled start time):
     - Bypass quiet hours evaluation completely.
     - Dispatch immediate notification with `priority: HIGH`.

---

## 5. Worker Reliability, Idempotency & Retry Policies

1. **Job Idempotency & Deduplication**:
   - All BullMQ jobs must be submitted with deterministic `jobId` keys:
     - Webhooks: `webhook_fw_${txRef}`
     - Quiet digest: `quiet_digest_${userId}_${targetDateString}`
     - Shift published broadcast: `shift_pub_${shiftId}`

2. **Retry Policies & Dead Letter Queues**:
   - Configure BullMQ worker options with exponential backoff:
     ```typescript
     {
       attempts: 5,
       backoff: {
         type: 'exponential',
         delay: 2000
       },
       removeOnComplete: true,
       removeOnFail: false // Retain failed jobs for inspection
     }
     ```
   - Unhandled worker exceptions must log structured error contexts without dropping queue execution.
