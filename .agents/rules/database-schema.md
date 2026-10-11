---
trigger: glob
---

# Rule: Database Schema & Multi-Tenant Sharding Architecture
**Scope**: Prisma Schemas (`/server/prisma`), Database Migrations, Seeders, and Repository/ORM Access  
**Authority**: Mandatory Governance (Enforced in Antigravity)

---

## 1. Core Principle
Data isolation between distinct tenants (`teamId`) is an existential security boundary. Cross-tenant leakage, slow table scans on multi-tenant feeds, or invalid cross-shard relational joins constitute critical operational failures.

---

## 2. Multi-Tenant Isolation by `teamId`

1. **Mandatory Tenant Scoping**:
   - Every single query, mutation, count, or existence check on tenant-scoped tables (`Shift`, `ShiftSwapRequest`, `ActivityFeedItem`, `Subscription`, `SubscriptionLedger`, `TeamMembership`, `TeamInvitation`, `IdempotencyKey`) MUST include `where: { teamId }`.
   - Never write an un-scoped query (e.g., `prisma.shift.findUnique({ where: { id } })`). Always use:
     ```typescript
     prisma.shift.findFirst({
       where: { id: shiftId, teamId: currentTeamId }
     });
     ```
   - Automated Prisma Client extension interceptors must validate and reject any tenant-bound query missing `teamId`.

2. **No Cross-Tenant Operations**:
   - Updates, deletes, and bulk operations must always be isolated by `teamId`. Attempting to access or mutate records belonging to a different tenant must immediately return HTTP `404 Not Found` (never disclose existence across tenants).

---

## 3. Sharding Topology & Router (`2-DB Sharding Simulation`)

1. **Physical Architecture**:
   - **Central Directory (`DB_SHARD_0`)**: Contains global auth entities: `User`, `Team`, `TeamMembership`, `RefreshToken`, `DevicePushToken`.
   - **Tenant Domain (`DB_SHARD_0` and `DB_SHARD_1`)**: Houses tenant-bound operational entities: `Shift`, `ShiftSwapRequest`, `ActivityFeedItem`, `Subscription`, `SubscriptionLedger`, `IdempotencyKey`.

2. **Mathematical Sharding Hash Router**:
   - Shard dispatching must strictly use unsigned 32-bit CRC32 modulo 2:
     ```typescript
     export function resolveTeamShard(teamId: string): 0 | 1 {
       const hash = crc32(teamId) >>> 0;
       return (hash % 2) as 0 | 1;
     }
     ```
   - All tenant queries must route through `ShardedPrismaManager.getClient(teamId)`.

3. **Application-Level Referential Integrity (`relationMode = "prisma"`)**:
   - The Prisma schema datasource must declare:
     ```prisma
     datasource db {
       provider     = "postgresql"
       url          = env("DATABASE_URL")
       relationMode = "prisma"
     }
     ```
   - NEVER rely on database-level foreign key cascades or cross-database foreign key constraints across shards. Integrity must be handled explicitly in application transaction workflows.

---

## 4. Activity Feed Composite Indexing & Cursor Pagination

1. **Index Definition**:
   - `ActivityFeedItem` must define the composite index:
     ```prisma
     @@index([teamId, createdAt(sort: Desc), id(sort: Desc)])
     @@unique([createdAt, id])
     ```

2. **Absolute Ban on SQL `OFFSET`**:
   - Never use `skip: offset` for pagination in `ActivityFeedItem` or high-volume lists.
   - Cursor seek must be strictly $O(1)$ composite index seek using base64-encoded `(createdAt, id)`:
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
   - Queries must sustain $< 20\text{ms}$ execution time with 10,000+ seeded records per tenant.

---

## 5. Connection Pooling & Resource Governance

1. **PgBouncer & Connection Limits**:
   - All PostgreSQL connection URLs must explicitly configure PgBouncer compatibility and connection limits:
     `DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=15"`
   - Server processes must not exhaust connection pools through uncontrolled long-running transactions.

2. **Prisma Type & Field Conventions**:
   - All primary keys must be `@id @default(uuid()) @db.Uuid`.
   - All foreign keys referencing UUIDs must use `@db.Uuid`.
   - All date columns must use `@db.Timestamptz(6)` to guarantee microsecond precision and UTC timezone preservation.
   - String fields must define bounded lengths: `@db.VarChar(50)`, `@db.VarChar(100)`, or `@db.VarChar(255)`. Only notes/descriptions may use `@db.Text`.

3. **Schema Migrations**:
   - Any schema modification must pass `npx prisma validate`.
   - Migrations must apply cleanly to both `DB_SHARD_0` and `DB_SHARD_1` targets without data loss.
