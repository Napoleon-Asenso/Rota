# ARCHITECTURE.md
## Technical System Architecture, Data Flow & Distributed Design
**Project: Rota – Mobile-First Shift Scheduling & Workforce Coordination Platform**

---

## 1. System Topology & Component Layout

```
+-----------------------------------------------------------------------------------+
|                        Mobile Client (React Native / Expo SDK 51)                 |
|  - UI: Matisse Design System Tokens (matisse-tokens-all.json)                     |
|  - Token Storage: expo-secure-store                                               |
|  - Local Offline Cache: Encrypted MMKV / SQLite (Shifts: [today - 14d, + 60d])    |
|  - Mutation Queue: Expiration guard (clientExpiresAt)                             |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTPS / REST (Bearer JWT / Refresh Token)
                                          v
+-----------------------------------------------------------------------------------+
|                     Express.js Gateway / Middleware Pipeline                      |
|  1. Security: helmet & cors                                                       |
|  2. RateLimiter: Redis sliding-window (100 req/min general, 10 req/min auth/bill) |
|  3. AuthMiddleware: JWT decode, signature verify, tokenVersion check              |
|  4. TenantContext: teamId param check, Redis role lookup (TTL 60s), RBAC gate    |
|  5. Idempotency: Redis atomic lock (lock:idempotency:{teamId}:{key} EX 30 NX)    |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                      Tenant Router & 2-DB Sharding Dispatcher                     |
|                   shardIndex = (crc32(teamId) >>> 0) % 2                          |
|                   relationMode = "prisma" (App-level referential integrity)       |
+-----------------------------------------------------------------------------------+
                     /                                             \
     (shardIndex == 0)                                             (shardIndex == 1)
                    v                                               v
+-------------------------------------+   +-------------------------------------+
|        Prisma Client: Shard 0       |   |        Prisma Client: Shard 1       |
|    (?pgbouncer=true&limit=15)       |   |    (?pgbouncer=true&limit=15)       |
+-------------------------------------+   +-------------------------------------+
|      PostgreSQL: DB_SHARD_0         |   |      PostgreSQL: DB_SHARD_1         |
|  - Central Directory (Global Auth): |   |  - Tenant Operational Domain:       |
|    User, Team, TeamMembership,      |   |    Shift, ShiftSwapRequest,         |
|    RefreshToken, DevicePushToken    |   |    ActivityFeedItem, Subscription,  |
|  - Shard 0 Tenant Operational Data: |   |    SubscriptionLedger,              |
|    Shift, ShiftSwapRequest, ...     |   |    IdempotencyKey                   |
+-------------------------------------+   +-------------------------------------+
                   \                                               /
                    \                                             /
                     v                                           v
+-----------------------------------------------------------------------------------+
|                     Upstash Redis (Cluster / In-Memory State)                     |
|  - BullMQ Queues: 'notification-digest', 'billing-webhooks', 'audit-events'       |
|  - Token Grace Window: token:grace:{hash(R1)} -> {hash(R2)} (EX 15s)              |
|  - Distributed Locks: redlock:team_seats:{teamId}, redlock:swap:{swapId}          |
|  - RBAC Cache: team:{teamId}:user:{userId}:role (TTL 60s)                         |
|  - Quiet Digest Buffers: user:{userId}:quiet_digest_queue (Redis List)            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             BullMQ Asynchronous Workers                           |
|  - NotificationWorker: Timezone calculation, midnight-spanning quiet hours,      |
|    morning digest consolidation, Expo Push dispatch                               |
|  - WebhookWorker: Timing-safe Flutterwave verification, idempotency deduplication |
+-----------------------------------------------------------------------------------+
```

---

## 2. 2-Database Sharding & Central Directory Architecture

### 2.1 Entity Allocation Split

| Database Target | Models Hosted | Referential Strategy |
| :--- | :--- | :--- |
| **`DB_SHARD_0` (Central Directory)** | `User`, `Team`, `TeamMembership`, `RefreshToken`, `DevicePushToken` | Global auth and identity. Queried during login without requiring a team context. |
| **`DB_SHARD_0` & `DB_SHARD_1` (Tenant Domain)** | `Shift`, `ShiftSwapRequest`, `ActivityFeedItem`, `Subscription`, `SubscriptionLedger`, `IdempotencyKey` | Sharded by `teamId`. Physical isolation prevents cross-shard database queries. |

### 2.2 Mathematical Sharding Router
```typescript
export function resolveTeamShardIndex(teamId: string): 0 | 1 {
  const hash = crc32(teamId) >>> 0; // Unsigned 32-bit integer
  return (hash % 2) as 0 | 1;
}
```

### 2.3 Application-Level Referential Integrity (`relationMode = "prisma"`)
Because entities for a single user (e.g., `User` on `DB_SHARD_0` and `Shift` on `DB_SHARD_1`) cross database instances:
1. Native PostgreSQL Foreign Key constraints across databases are physically impossible.
2. The schema specifies `relationMode = "prisma"`.
3. Deletions and cascade cleanups are executed transactionally in application services, never via database cascades.

---

## 3. High-Performance Cursor Pagination ($O(1)$ Index Seek)

### 3.1 The Performance Problem
Using SQL `OFFSET` requires PostgreSQL to scan and discard rows sequentially:
$$\text{Cost} = O(N) \quad (\text{Degrades to } > 1500\text{ms at } 10,000\text{ records})$$

### 3.2 Composite Index Architecture
In `ActivityFeedItem`:
```prisma
@@index([teamId, createdAt(sort: Desc), id(sort: Desc)])
@@unique([createdAt, id])
```

### 3.3 Relational Seek Mechanics
```typescript
const items = await prisma.activityFeedItem.findMany({
  where: {
    teamId,
    ...(cursor ? {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } }
      ]
    } : {})
  },
  orderBy: [
    { createdAt: 'desc' },
    { id: 'desc' }
  ],
  take: limit + 1
});
```
This guarantees an execution plan using `Index Scan` on `(team_id, created_at, id)` with execution times $<20\text{ms}$ regardless of table size.

---

## 4. Shift Swap State Machine & Atomic Reassignment

### 4.1 State Machine Lifecycle

```
[Draft Shift] ──> [Published Shift]
                         │
                         ▼
        ┌───────────────────────────────────┐
        │ Initiator creates Swap Request    │
        └───────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
   (Direct Peer Swap)         (Open Pool Drop)
            │                         │
            ▼                         ▼
 [PENDING_PEER_APPROVAL]      [OPEN_FOR_CLAIM]
            │                         │
            │ Peer Accepts            │ Staff Claims
            └────────────┬────────────┘
                         ▼
            [PENDING_MANAGER_APPROVAL]
                         │
            ┌────────────┴────────────┐
            │ Manager Review          │
            ▼                         ▼
       [APPROVED]                [REJECTED]
            │
            ▼
 (Atomic Reassignment in DB)
```

### 4.2 Invariants & Concurrency Guards
1. **Single Active Swap Invariant**: A shift cannot be referenced in a new swap if it is already present in an active swap (`OPEN_FOR_CLAIM`, `PENDING_PEER_APPROVAL`, `PENDING_MANAGER_APPROVAL`).
2. **Atomic Approval Transaction**:
   - Verify neither shift has already started (`startTime > NOW()`).
   - Atomically swap `assignedToId` on the corresponding `Shift` records.
   - Update `ShiftSwapRequest.status = APPROVED`.
   - Insert activity feed events for both members.
   - Trigger BullMQ notifications for both members.

---

## 5. Billing, Proration & Seat Concurrency

### 5.1 Billable Seat Invariant
$$\text{Consumed Seats} = \text{COUNT}(\text{TeamMembership WHERE isActive = true}) + \text{COUNT}(\text{TeamInvitation WHERE acceptedAt IS NULL AND expiresAt} > \text{NOW}())$$

### 5.2 Concurrency Gating
All member additions and invitations must acquire `redlock:team_seats:{teamId}`. If $\text{Consumed Seats} \ge \text{Subscription.totalSeats}$, abort with HTTP `402 Payment Required`.

### 5.3 Integer-Cent Proration
- **Seat Addition**:
  $$\text{Charge (cents)} = \left\lfloor \frac{N_{\text{new}} \times U \times D_{\text{remaining}}}{D_{\text{total}}} \right\rfloor$$
- **Plan Upgrade**:
  $$\text{Immediate Due (cents)} = \max\left(0, \left\lfloor \frac{\text{Price}_{\text{new}} \times D_{\text{rem}}}{D_{\text{tot}}} \right\rfloor - \left\lfloor \frac{\text{Price}_{\text{old}} \times D_{\text{rem}}}{D_{\text{tot}}} \right\rfloor\right)$$

### 5.4 Directional Financial Ledger
All financial entries are immutably appended to `subscription_ledgers`:
- Direction: `DEBIT` or `CREDIT`.
- Running balance: verified and recorded as `balanceAfterCents`.

---

## 6. Timezone-Aware Quiet Hours & Notification Digest

### 6.1 Midnight-Spanning Evaluation
Given user's local time $T_{\text{local}}$ formatted as `"HH:mm"`:
- If $T_{\text{start}} > T_{\text{end}}$ (e.g., `22:00` to `07:00`):
  $$\text{isQuiet} = (T_{\text{local}} \ge T_{\text{start}} \lor T_{\text{local}} < T_{\text{end}})$$
- If $T_{\text{start}} < T_{\text{end}}$ (daytime quiet window):
  $$\text{isQuiet} = (T_{\text{local}} \ge T_{\text{start}} \land T_{\text{local}} < T_{\text{end}})$$

### 6.2 Morning Digest Consolidation Flow
1. If `isQuiet = true` and urgency is `NORMAL`:
   - Append to Redis list: `user:{userId}:quiet_digest_queue`.
   - Calculate delay until `quietHoursEnd` (07:00 AM local time).
   - Enqueue single delayed BullMQ job with deduplication ID `quiet_digest_${userId}_${targetDate}`.
2. At 07:00 AM:
   - Worker wakes up, pops all notifications from Redis list.
   - Dispatches single consolidated push: *"Rota: You have N schedule updates for this week."*
3. If urgency is `CRITICAL` (e.g., cancellation $<2\text{h}$ before shift):
   - Bypass quiet hours and dispatch immediately with `priority: HIGH`.
