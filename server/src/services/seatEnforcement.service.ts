import { PrismaClient, LedgerType } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/prisma';
import { PLANS, PlanTierName } from './billingConstants';
import { calculateSeatAdditionProration } from './proration.service';
import { appendLedgerEntry } from './ledger.service';

export interface SeatCheckResult {
  allowed: boolean;
  consumedSeats: number;
  totalSeats: number;
  availableSeats: number;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

/**
 * Enforces the Billable Seat Invariant:
 * Consumed Seats = COUNT(Active Members)
 * Throws or returns HTTP 402 SEAT_LIMIT_REACHED if consumed + needed > totalSeats.
 */
export async function verifySeatCapacity(
  teamId: string,
  seatsNeeded: number = 1,
  prismaClient: PrismaClient = defaultPrisma
): Promise<SeatCheckResult> {
  const subscription = await prismaClient.subscription.findUnique({
    where: { teamId }
  });

  if (!subscription) {
    return {
      allowed: false,
      consumedSeats: 0,
      totalSeats: 0,
      availableSeats: 0,
      error: {
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: 'No active subscription found for this team.',
        statusCode: 402
      }
    };
  }

  const activeMembersCount = await prismaClient.membership.count({
    where: { teamId }
  });

  const consumedSeats = activeMembersCount;
  const totalSeats = subscription.seatCount;
  const availableSeats = Math.max(0, totalSeats - consumedSeats);

  if (consumedSeats + seatsNeeded > totalSeats) {
    return {
      allowed: false,
      consumedSeats,
      totalSeats,
      availableSeats,
      error: {
        code: 'SEAT_LIMIT_REACHED',
        message: `Team seat limit reached (${consumedSeats}/${totalSeats} seats used). Upgrade plan or add seats.`,
        statusCode: 402
      }
    };
  }

  return {
    allowed: true,
    consumedSeats,
    totalSeats,
    availableSeats
  };
}

/**
 * Purchases additional seats with server-side proration calculation and ledger record.
 */
export async function purchaseAdditionalSeats(params: {
  teamId: string;
  additionalSeats: number;
  idempotencyKey: string;
  prismaClient?: PrismaClient;
  now?: Date;
}) {
  const prismaClient = params.prismaClient ?? defaultPrisma;

  return await prismaClient.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { teamId: params.teamId }
    });

    if (!sub) {
      throw {
        statusCode: 404,
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found'
      };
    }

    const tierName = sub.tier as PlanTierName;
    const planConfig = PLANS[tierName];

    if (planConfig.extraSeatCents === null) {
      throw {
        statusCode: 422,
        code: 'EXTRA_SEATS_NOT_ALLOWED',
        message: `${tierName} plan does not allow purchasing extra seats. Upgrade to Team or Business.`
      };
    }

    const newTotalSeats = sub.seatCount + params.additionalSeats;
    if (planConfig.maxSeatCap !== null && newTotalSeats > planConfig.maxSeatCap) {
      throw {
        statusCode: 422,
        code: 'PLAN_SEAT_CAP_EXCEEDED',
        message: `Cannot exceed maximum cap of ${planConfig.maxSeatCap} seats for ${tierName} plan.`
      };
    }

    // Calculate integer-cent proration
    const proratedChargeCents = calculateSeatAdditionProration({
      additionalSeats: params.additionalSeats,
      unitSeatPriceCents: planConfig.extraSeatCents,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      now: params.now
    });

    // Update Subscription
    const updatedSub = await tx.subscription.update({
      where: { teamId: params.teamId },
      data: { seatCount: newTotalSeats }
    });

    // Record immutable ledger entry
    const ledgerEntry = await appendLedgerEntry(
      {
        teamId: params.teamId,
        type: LedgerType.CHARGE,
        amountCents: proratedChargeCents,
        description: `Prorated charge for ${params.additionalSeats} additional seats`,
        idempotencyKey: params.idempotencyKey
      },
      tx as unknown as PrismaClient
    );

    return {
      subscription: updatedSub,
      proratedChargeCents,
      ledgerEntry
    };
  });
}
