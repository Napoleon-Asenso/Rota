# BACKEND_GUIDE.md
## Express.js, Prisma Sharding & BullMQ Worker Architecture Guide
**Project: Rota – Mobile-First Shift Scheduling & Workforce Coordination Platform**  
**Runtime**: Node.js (v20+ LTS) with TypeScript & Express.js  
**Database**: PostgreSQL 16 with Prisma ORM (`relationMode = "prisma"`)  
**Cache & Queues**: Upstash-compatible Redis, BullMQ (v5+)

---

## 1. Directory Structure & Layer Responsibilities

```
server/
├── prisma/
│   ├── schema.prisma       # Canonical Prisma schema (relationMode = "prisma")
│   └── seed.ts             # 10,000+ record seeder for load & index testing
├── scripts/
│   ├── migrate-shards.ts   # Dual-shard DB push runner
│   └── mock-webhook.ts     # CLI webhook runner generating signed payloads
├── src/
│   ├── config/             # Zod environment variable loader
│   ├── controllers/        # Express route handlers (Auth, Shifts, Swaps, Billing, Feed)
│   ├── db/                 # ShardedPrismaManager (CRC32 router, Shard 0/1 clients)
│   ├── middleware/         # Security, RateLimiter, Auth, TenantContext, Idempotency
│   ├── queues/             # BullMQ queue producers
│   ├── routes/             # Express v1 route definitions
│   ├── services/           # ProrationEngine, ConflictDetector, WebhookVerifier
│   ├── types/              # Express augmentations, JWT payloads, domain types
│   ├── utils/              # Redis helpers, date-fns-tz, logger, crc32
│   ├── workers/            # BullMQ worker consumers (Notification, Webhook)
│   └── app.ts              # Express initialization and entry point
├── package.json
└── tsconfig.json
```

---

## 2. Express Middleware Pipeline Execution Order

Every incoming HTTP request traverses this sequential pipeline:

```
Request Ingress
      │
      ▼
1. Helmet & CORS                (Security headers, CORS origin verification)
      │
      ▼
2. Redis Rate Limiter           (Sliding-window: 100/min standard, 10/min auth/billing)
      │
      ▼
3. Auth Middleware              (Validates JWT signature, checks User.tokenVersion)
      │
      ▼
4. Tenant Context Middleware    (Resolves teamId, validates active membership & role)
      │
      ▼
5. Idempotency Middleware       (Inspects Idempotency-Key, acquires Redis lock EX 30s)
      │
      ▼
6. Controller & Business Logic
```

---

## 3. Redis Key Namespacing & TTL Standards

To prevent key collisions and memory leaks in Redis, all keys must adhere to canonical namespaces:

| Purpose | Canonical Key Pattern | Type | TTL / Eviction |
| :--- | :--- | :--- | :--- |
| **Token Grace Window** | `token:grace:{hash(R1)}` | String | `15 seconds` |
| **RBAC Role Cache** | `team:{teamId}:user:{userId}:role` | String | `60 seconds` (synchronously purged on update) |
| **Seat Concurrency Lock** | `redlock:team_seats:{teamId}` | String | `5 seconds` |
| **Idempotency Lock** | `lock:idempotency:{teamId}:{key}` | String | `30 seconds` |
| **Quiet Digest Queue** | `user:{userId}:quiet_digest_queue` | List | Popped at 07:00 AM local time |
| **Rate Limit Counter** | `ratelimit:{ip\|userId}:{minuteWindow}` | String | `60 seconds` |

---

## 4. Dual-Shard Routing & Prisma Connection Pooling

### 4.1 Connection String Pooling
All connection URLs must include PgBouncer configuration parameters:
```env
DATABASE_URL_SHARD_0="postgresql://user:pass@host0:5432/rota_shard_0?pgbouncer=true&connection_limit=15"
DATABASE_URL_SHARD_1="postgresql://user:pass@host1:5432/rota_shard_1?pgbouncer=true&connection_limit=15"
```

### 4.2 Shard Resolution Rule
- Global identity lookups (`User`, `TeamMembership`) route to `ShardedPrismaManager.getCentralClient()`.
- Tenant operational entities (`Shift`, `ShiftSwapRequest`, `ActivityFeedItem`, `Subscription`, `SubscriptionLedger`) route to:
  ```typescript
  const client = ShardedPrismaManager.getClient(teamId);
  ```
  Where `shardIndex = (crc32(teamId) >>> 0) % 2`.

---

## 5. BullMQ Workers & Reliability Standards

### 5.1 Queues Declared
1. `'notification-digest'`: Dispatches push alerts via Expo, respects quiet hours, and triggers morning consolidated digests.
2. `'billing-webhooks'`: Ingests Flutterwave webhook events, validates idempotency keys, and appends ledger entries.
3. `'audit-events'`: Persists activity feed events under high load.

### 5.2 Worker Retry Policy
```typescript
{
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: true,
  removeOnFail: false // Retain failed jobs for dead-letter analysis
}
```

---

## 6. Seed Engine & Load Testing

### 6.1 10,000+ Record Seeder
The database seeder (`server/prisma/seed.ts`) populates:
- 1 Owner, 3 Managers, 20 Staff members.
- Active subscriptions and ledger histories.
- 10,000+ records in `ActivityFeedItem` distributed across dates to validate composite index scans.

### 6.2 k6 Activity Feed Stress Test
Located in `load-tests/k6-activity-feed.js`:
- Simulates 50 virtual users scrolling the activity feed with cursors.
- Performance gate: **p95 latency $<20\text{ms}$**.
