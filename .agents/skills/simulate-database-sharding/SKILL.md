---
name: simulate-database-sharding
description: Runbook for implementing the 2-database sharded architecture, CRC32 tenant router, Central Directory pattern, and relationMode = "prisma" integrity.
version: 1.0.0
---

# Simulate Database Sharding Skill

## 1. Context & Purpose
This skill establishes the architecture for Rota's simulated 2-database horizontal sharding topology. It segregates identity in a Central Directory from operational tenant workloads distributed across independent databases via CRC32 hashing. It ensures zero cross-shard foreign key collisions while maintaining high connection pool efficiency.

---

## 2. Invariants & Sharding Guardrails

- **Central Directory vs. Tenant Shards**:
  - Global Identity on `DB_SHARD_0`: `User`, `Team`, `TeamMembership`, `RefreshToken`, `DevicePushToken`.
  - Tenant Operational Domain across `DB_SHARD_0` and `DB_SHARD_1`: `Shift`, `ShiftSwapRequest`, `ActivityFeedItem`, `Subscription`, `SubscriptionLedger`, `IdempotencyKey`.
- **Mathematical Router Formula**:
  $$\text{shardIndex} = (\text{crc32}(\text{teamId}) \gg 0) \pmod 2$$
- **Application-Level Referential Integrity**:
  - Prisma schema datasource MUST declare `relationMode = "prisma"`.
  - NEVER rely on database-level foreign key cascades across shards. Cross-entity cleanup must be handled via application transactions.
- **Mandatory Tenant Scoping**:
  - Every query to a tenant table MUST include `where: { teamId }`.
- **PgBouncer Pooling**:
  - All connection strings must configure `?pgbouncer=true&connection_limit=15`.

---

## 3. CRC32 Tenant Router Implementation

In `server/src/utils/crc32.ts`:

```typescript
// Fast 32-bit CRC implementation without external native dependencies
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c;
}

export function crc32(str: string): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export function resolveTeamShardIndex(teamId: string): 0 | 1 {
  const hash = crc32(teamId);
  return (hash % 2) as 0 | 1;
}
```

---

## 4. Sharded Prisma Client Manager

In `server/src/db/sharded-prisma-manager.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { resolveTeamShardIndex } from '../utils/crc32';

export class ShardedPrismaManager {
  private static centralClient: PrismaClient;
  private static shard0Client: PrismaClient;
  private static shard1Client: PrismaClient;

  public static initialize(): void {
    const shard0Url = process.env.DATABASE_URL_SHARD_0 || process.env.DATABASE_URL;
    const shard1Url = process.env.DATABASE_URL_SHARD_1 || process.env.DATABASE_URL;

    if (!shard0Url || !shard1Url) {
      throw new Error('Missing database connection strings for shard targets.');
    }

    this.shard0Client = new PrismaClient({
      datasources: { db: { url: `${shard0Url}?pgbouncer=true&connection_limit=15` } }
    });

    this.shard1Client = new PrismaClient({
      datasources: { db: { url: `${shard1Url}?pgbouncer=true&connection_limit=15` } }
    });

    // Central Directory resides on Shard 0
    this.centralClient = this.shard0Client;
  }

  /**
   * Returns the Central Directory client for User, Team, and Membership lookups.
   */
  public static getCentralClient(): PrismaClient {
    if (!this.centralClient) this.initialize();
    return this.centralClient;
  }

  /**
   * Resolves the appropriate tenant shard client using CRC32(teamId) % 2.
   */
  public static getClient(teamId: string): PrismaClient {
    if (!this.shard0Client || !this.shard1Client) this.initialize();

    const shardIndex = resolveTeamShardIndex(teamId);
    return shardIndex === 0 ? this.shard0Client : this.shard1Client;
  }

  public static async disconnectAll(): Promise<void> {
    await Promise.all([
      this.shard0Client?.$disconnect(),
      this.shard1Client?.$disconnect()
    ]);
  }
}
```

---

## 5. Dual-Shard Migration & Seeding Script

In `server/scripts/migrate-shards.ts`:

```typescript
import { execSync } from 'child_process';

const shards = [
  { name: 'DB_SHARD_0', url: process.env.DATABASE_URL_SHARD_0 },
  { name: 'DB_SHARD_1', url: process.env.DATABASE_URL_SHARD_1 }
];

async function runDualShardMigrations() {
  for (const shard of shards) {
    if (!shard.url) {
      console.warn(`Skipping ${shard.name}: URL not defined.`);
      continue;
    }

    console.log(`Applying migrations to ${shard.name}...`);
    execSync(`npx prisma db push --skip-generate`, {
      env: { ...process.env, DATABASE_URL: shard.url },
      stdio: 'inherit'
    });
  }
  console.log('Dual-shard database push completed successfully.');
}

runDualShardMigrations();
```

---

## 6. Tenant-Bound Extension Interceptor

In `server/src/db/tenant-interceptor.ts`:

```typescript
import { Prisma } from '@prisma/client';

/**
 * Prisma Client extension preventing cross-tenant leakage.
 * Automatically verifies that any query on a tenant-scoped model includes teamId.
 */
export const tenantSafetyExtension = Prisma.defineExtension({
  name: 'tenantSafety',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantModels = [
          'Shift',
          'ShiftSwapRequest',
          'ActivityFeedItem',
          'Subscription',
          'SubscriptionLedger',
          'TeamMembership'
        ];

        if (tenantModels.includes(model)) {
          const where = (args as any)?.where;
          if (!where || !where.teamId) {
            throw new Error(
              `SECURITY_VIOLATION: Query on tenant-bound model '${model}' without explicit teamId constraint.`
            );
          }
        }

        return query(args);
      }
    }
  }
});
```

---

## 7. Verification Checklist

1. **Deterministic Distribution**: Test 100 random UUIDs against `resolveTeamShardIndex(teamId)`; verify distribution is approximately 50/50 across shard 0 and shard 1.
2. **Central Directory Login**: Verify user can authenticate using `getCentralClient()` to locate `User` and `TeamMembership` records without needing a predetermined `teamId`.
3. **Physical Isolation**: Verify a query for a team mapped to Shard 1 does not execute against or touch Shard 0.
4. **Prisma Relation Mode**: Run `npx prisma validate` and verify `relationMode = "prisma"` is declared in the datasource block.
