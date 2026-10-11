---
name: implement-cursor-pagination
description: Deterministic guide for building high-performance composite cursor pagination on high-volume feeds and lists without SQL OFFSET.
version: 1.0.0
---

# Implement Cursor Pagination Skill

## 1. Context & Purpose
This skill provides the authoritative engineering runbook for implementing $O(1)$ cursor-based pagination across high-volume PostgreSQL collections (specifically `ActivityFeedItem`, `Shift`, and audit records). 

Using SQL `OFFSET` on datasets exceeding 10,000 records causes table-scanning degradation with latency exceeding $1500\text{ms}$. In Rota, the Activity Feed query must sustain $<20\text{ms}$ latency for 10,000+ records under mobile scroll load.

---

## 2. Invariants & Guardrails

- **Zero SQL `OFFSET`**: Never use `skip: offset` in Prisma queries for feeds or large lists.
- **Strict Composite Cursors**: Pagination must strictly utilize composite order keys `(created_at DESC, id DESC)`.
- **Base64 Payload Format**: The cursor string must be a base64-encoded JSON string: `base64(JSON.stringify({ createdAt: string, id: string }))`.
- **Tenant Scoping**: All queries must enforce `where: { teamId }`.
- **Deterministic Fetch Size**: Always query with `take: limit + 1` to compute `hasNextPage` and `nextCursor` without an extra `COUNT(*)` query.

---

## 3. Database Indexing Requirement

In `server/prisma/schema.prisma`, any model supporting cursor pagination must declare a matching composite index:

```prisma
model ActivityFeedItem {
  id         String         @id @default(uuid()) @db.Uuid
  teamId     String         @map("team_id") @db.Uuid
  actorId    String         @map("actor_id") @db.Uuid
  action     ActivityAction
  entityId   String         @map("entity_id") @db.Uuid
  entityType String         @map("entity_type") @db.VarChar(50)
  metadata   Json           @default("{}")
  createdAt  DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)

  team       Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  actor      User           @relation(fields: [actorId], references: [id], onDelete: Cascade)

  @@index([teamId, createdAt(sort: Desc), id(sort: Desc)])
  @@unique([createdAt, id])
  @@map("activity_feed_items")
}
```

---

## 4. Cursor Codec Implementation

Create or use `server/src/utils/cursor.ts` for safe, schema-validated encoding and decoding:

```typescript
import { z } from 'zod';

const CursorPayloadSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid()
});

export type CursorPayload = z.infer<typeof CursorPayloadSchema>;

export function encodeCursor(payload: { createdAt: Date | string; id: string }): string {
  const iso = payload.createdAt instanceof Date ? payload.createdAt.toISOString() : payload.createdAt;
  const raw = JSON.stringify({ createdAt: iso, id: payload.id });
  return Buffer.from(raw, 'utf8').toString('base64url');
}

export function decodeCursor(cursorString: string): CursorPayload | null {
  try {
    const raw = Buffer.from(cursorString, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    const result = CursorPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
```

---

## 5. Repository & Service Query Implementation

In `server/src/services/feed.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { decodeCursor, encodeCursor } from '../utils/cursor';

export interface FeedQueryOptions {
  teamId: string;
  cursor?: string;
  limit?: number; // default 25, max 100
}

export interface PaginatedFeedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function getTeamActivityFeed(
  prisma: PrismaClient,
  options: FeedQueryOptions
): Promise<PaginatedFeedResponse<any>> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const decoded = options.cursor ? decodeCursor(options.cursor) : null;

  const records = await prisma.activityFeedItem.findMany({
    where: {
      teamId: options.teamId,
      ...(decoded
        ? {
            OR: [
              { createdAt: { lt: new Date(decoded.createdAt) } },
              {
                createdAt: new Date(decoded.createdAt),
                id: { lt: decoded.id }
              }
            ]
          }
        : {})
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    take: limit + 1
  });

  const hasMore = records.length > limit;
  const items = hasMore ? records.slice(0, limit) : records;
  const lastItem = items[items.length - 1];

  const nextCursor = hasMore && lastItem
    ? encodeCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
    : null;

  return {
    items,
    nextCursor,
    hasMore
  };
}
```

---

## 6. HTTP Controller & Zod Validation

In `server/src/controllers/feed.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { getTeamActivityFeed } from '../services/feed.service';
import { ShardedPrismaManager } from '../db/sharded-prisma-manager';

export const GetFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export async function getActivityFeedHandler(req: Request, res: Response): Promise<void> {
  const query = GetFeedQuerySchema.parse(req.query);
  const teamId = req.params.teamId;

  const prisma = ShardedPrismaManager.getClient(teamId);
  const result = await getTeamActivityFeed(prisma, {
    teamId,
    cursor: query.cursor,
    limit: query.limit
  });

  res.status(200).json({
    success: true,
    data: result
  });
}
```

---

## 7. Mobile React Native Infinite Scroll Integration

In `app/src/hooks/useActivityFeed.ts`:

```typescript
import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export function useActivityFeed(teamId: string) {
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchNextPage = useCallback(async (isRefresh = false) => {
    if (loading || (!hasMore && !isRefresh)) return;
    setLoading(true);

    try {
      const cursorParam = isRefresh ? undefined : nextCursor;
      const res = await apiClient.get(`/api/v1/teams/${teamId}/feed`, {
        params: { cursor: cursorParam, limit: 25 }
      });

      const { data } = res.data;
      setItems(prev => (isRefresh ? data.items : [...prev, ...data.items]));
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, [teamId, nextCursor, loading, hasMore]);

  return { items, hasMore, loading, fetchNextPage };
}
```

---

## 8. Verification & Performance Checklist

1. **Verify Index Usage**: Run `EXPLAIN ANALYZE` on PostgreSQL:
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM activity_feed_items 
   WHERE team_id = '...' 
     AND (created_at < '...' OR (created_at = '...' AND id < '...'))
   ORDER BY created_at DESC, id DESC 
   LIMIT 26;
   ```
   **Pass Condition**: Execution plan shows `Index Scan` using `activity_feed_items_team_id_created_at_id_idx` with zero `Seq Scan`.
2. **Execution Time**: Total execution time must be $<20\text{ms}$ on 10,000+ seeded records per tenant.
3. **No Duplicate Items**: Consecutive page requests must yield mutually exclusive item sets.
