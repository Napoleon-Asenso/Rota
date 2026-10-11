---
name: calculate-proration-and-ledger
description: Execution runbook for server-side integer-cent proration math, concurrency-safe seat management, and append-only financial ledger entries.
version: 1.0.0
---

# Calculate Proration & Ledger Skill

## 1. Context & Purpose
This skill governs all financial computations and billing operations in Rota. It provides the exact mathematical formulas, concurrency safeguards, and database persistence routines for:
- Adding seats mid-cycle.
- Upgrading plans mid-cycle (e.g., Starter to Team).
- Enforcing the Billable Seat Invariant against race conditions.
- Writing immutable directional ledger records into `subscription_ledgers`.
- Managing zero-cash-refund plan downgrades taking effect at `currentPeriodEnd`.

---

## 2. Invariants & Financial Guardrails

1. **Integer Minor Units Only**:
   - Every monetary figure must be an integer minor unit (`amountCents: Int` or `kobo: Int`).
   - Zero `FLOAT`, `DOUBLE`, or `DECIMAL` types permitted anywhere.
2. **Strict Rounding Down (`Math.floor`)**:
   - All proration division operations must round down to whole integer cents: `Math.floor(...)`.
3. **Billable Seat Invariant**:
   $$\text{Consumed Seats} = \text{COUNT}(\text{TeamMembership WHERE isActive = true}) + \text{COUNT}(\text{TeamInvitation WHERE acceptedAt IS NULL AND expiresAt} > \text{NOW}())$$
   - Adding a member or sending an invite must acquire `redlock:team_seats:{teamId}` or a row lock:
     ```sql
     SELECT total_seats FROM subscriptions WHERE team_id = $1 FOR UPDATE;
     ```
   - If $\text{Consumed Seats} \ge \text{Subscription.totalSeats}$, throw HTTP `402 Payment Required` (`SEAT_LIMIT_REACHED`).
4. **No Mid-Cycle Cash Refunds**:
   - Downgrades and seat reductions take effect strictly at `currentPeriodEnd`.
   - Never issue negative charges or refunds for mid-cycle seat decreases.
   - Reject downgrade if `activeMemberCount > targetPlanMaxSeats` with HTTP `422 Unprocessable Entity` (`ROSTER_EXCEEDS_TARGET_PLAN_CAP`).

---

## 3. Pricing Tier Constants

In `server/src/config/billing.constants.ts`:

```typescript
export interface PlanTier {
  plan: 'STARTER' | 'TEAM' | 'BUSINESS';
  basePriceCents: number;
  baseSeats: number;
  extraSeatPriceCents: number;
  maxSeatCap: number | null; // null represents unlimited
}

export const BILLING_PLANS: Record<string, PlanTier> = {
  STARTER: {
    plan: 'STARTER',
    basePriceCents: 2000, // $20.00
    baseSeats: 5,
    extraSeatPriceCents: 0, // cannot add extra seats
    maxSeatCap: 5
  },
  TEAM: {
    plan: 'TEAM',
    basePriceCents: 5000, // $50.00
    baseSeats: 15,
    extraSeatPriceCents: 300, // $3.00
    maxSeatCap: 35
  },
  BUSINESS: {
    plan: 'BUSINESS',
    basePriceCents: 12000, // $120.00
    baseSeats: 40,
    extraSeatPriceCents: 200, // $2.00
    maxSeatCap: null
  }
};
```

---

## 4. Proration Engine Formulas & Implementation

In `server/src/services/proration.service.ts`:

```typescript
import { differenceInSeconds } from 'date-fns';

export interface ProrationResult {
  chargeCents: number;
  unusedCreditCents: number;
  secondsRemaining: number;
  totalCycleSeconds: number;
}

/**
 * Calculates prorated charge for additional seats added mid-cycle.
 * Formula: floor( (N_new * U * D_remaining) / D_total )
 */
export function calculateSeatAdditionProration(params: {
  additionalSeats: number;
  unitSeatPriceCents: number;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
}): number {
  const now = params.now ?? new Date();
  const totalCycleSeconds = differenceInSeconds(params.periodEnd, params.periodStart);
  const secondsRemaining = differenceInSeconds(params.periodEnd, now);

  if (totalCycleSeconds <= 0 || secondsRemaining <= 0) {
    return 0;
  }

  const rawProration =
    (params.additionalSeats * params.unitSeatPriceCents * secondsRemaining) /
    totalCycleSeconds;

  return Math.floor(rawProration);
}

/**
 * Calculates prorated charge for plan upgrade mid-cycle.
 * Immediate Due = max(0, New Plan Cost - Unused Credit)
 */
export function calculatePlanUpgradeProration(params: {
  oldBasePriceCents: number;
  newBasePriceCents: number;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
}): ProrationResult {
  const now = params.now ?? new Date();
  const totalCycleSeconds = differenceInSeconds(params.periodEnd, params.periodStart);
  const secondsRemaining = differenceInSeconds(params.periodEnd, now);

  if (totalCycleSeconds <= 0 || secondsRemaining <= 0) {
    return {
      chargeCents: 0,
      unusedCreditCents: 0,
      secondsRemaining: 0,
      totalCycleSeconds: 0
    };
  }

  const unusedCreditCents = Math.floor(
    (params.oldBasePriceCents * secondsRemaining) / totalCycleSeconds
  );

  const newPlanCostCents = Math.floor(
    (params.newBasePriceCents * secondsRemaining) / totalCycleSeconds
  );

  const chargeCents = Math.max(0, newPlanCostCents - unusedCreditCents);

  return {
    chargeCents,
    unusedCreditCents,
    secondsRemaining,
    totalCycleSeconds
  };
}
```

---

## 5. Append-Only Financial Ledger Service

In `server/src/services/ledger.service.ts`:

```typescript
import { PrismaClient, LedgerEntryType, LedgerDirection } from '@prisma/client';

export interface RecordLedgerEntryInput {
  teamId: string;
  subscriptionId: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amountCents: number;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  flutterwaveTxRef?: string;
  idempotencyKey?: string;
}

export async function appendLedgerEntry(
  prisma: PrismaClient,
  input: RecordLedgerEntryInput
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch latest balance
    const lastEntry = await tx.subscriptionLedger.findFirst({
      where: { teamId: input.teamId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfterCents: true }
    });

    const previousBalance = lastEntry?.balanceAfterCents ?? 0;
    const balanceAfterCents =
      input.direction === 'DEBIT'
        ? previousBalance + input.amountCents
        : previousBalance - input.amountCents;

    // 2. Append immutable record
    return await tx.subscriptionLedger.create({
      data: {
        teamId: input.teamId,
        subscriptionId: input.subscriptionId,
        entryType: input.entryType,
        direction: input.direction,
        amountCents: input.amountCents,
        balanceAfterCents,
        currency: 'USD',
        description: input.description,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        flutterwaveTxRef: input.flutterwaveTxRef,
        idempotencyKey: input.idempotencyKey
      }
    });
  });
}
```

---

## 6. Seat Governance Invariant Transaction Pattern

In `server/src/services/seat-lock.service.ts`:

```typescript
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

export async function verifyAndReserveSeat(
  redis: Redis,
  prisma: PrismaClient,
  teamId: string,
  operation: (tx: any) => Promise<any>
): Promise<any> {
  const lockKey = `redlock:team_seats:${teamId}`;
  const lockAcquired = await redis.set(lockKey, 'locked', 'PX', 5000, 'NX');

  if (!lockAcquired) {
    throw new Error('CONCURRENT_SEAT_OPERATION');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current subscription seat limit
      const sub = await tx.subscription.findUnique({
        where: { teamId },
        select: { totalSeats: true }
      });

      if (!sub) {
        throw new Error('SUBSCRIPTION_NOT_FOUND');
      }

      // 2. Count active memberships and pending invites
      const activeMembersCount = await tx.teamMembership.count({
        where: { teamId, isActive: true }
      });

      const pendingInvitesCount = await tx.teamInvitation.count({
        where: {
          teamId,
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        }
      });

      const consumedSeats = activeMembersCount + pendingInvitesCount;

      if (consumedSeats >= sub.totalSeats) {
        const error: any = new Error('SEAT_LIMIT_REACHED');
        error.statusCode = 402;
        error.code = 'SEAT_LIMIT_REACHED';
        throw error;
      }

      return await operation(tx);
    });
  } finally {
    await redis.del(lockKey);
  }
}
```

---

## 7. Verification Test Suite

Every proration PR must pass unit tests covering:
1. **Zero Remaining Time**: `D_remaining = 0` yields `chargeCents = 0`.
2. **Leap Year Cycles**: Exact second arithmetic handles 29-day February cycles correctly.
3. **Mid-Cycle Upgrade**: Switching Starter ($2000) to Team ($5000) at 50% cycle duration yields:
   - Unused credit: $\lfloor 2000 \times 0.5 \rfloor = 1000$ cents.
   - New plan cost: $\lfloor 5000 \times 0.5 \rfloor = 2500$ cents.
   - Immediate charge: $2500 - 1000 = 1500$ cents ($15.00).
4. **Active Roster Cap on Downgrade**: Ensure API returns HTTP 422 if team has 12 active staff members and requests downgrade to Starter (cap: 5).
