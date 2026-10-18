/// <reference path="../types/declarations.d.ts" />
import { differenceInSeconds } from 'date-fns';
import { PLANS, PlanTierName } from './billingConstants';

export interface ProrationResult {
  chargeCents: number;
  unusedCreditCents: number;
  newPlanCostCents: number;
  secondsRemaining: number;
  totalCycleSeconds: number;
}

export interface DowngradeValidationResult {
  allowed: boolean;
  effectiveDate: 'CURRENT_PERIOD_END';
  refundCents: 0;
  targetMaxCap: number | null;
  activeMemberCount: number;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

/**
 * Calculates prorated charge for additional seats added mid-cycle.
 * Formula: floor( (N_new * U * D_remaining) / D_total )
 * Division strictly rounds down to whole integer cents.
 */
export function calculateSeatAdditionProration(params: {
  additionalSeats: number;
  unitSeatPriceCents: number;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
}): number {
  if (params.additionalSeats <= 0 || params.unitSeatPriceCents <= 0) {
    return 0;
  }

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
 * Formula:
 *   Unused Credit = floor( (OldBasePrice * D_remaining) / D_total )
 *   New Plan Cost = floor( (NewBasePrice * D_remaining) / D_total )
 *   Immediate Due = max(0, New Plan Cost - Unused Credit)
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
      newPlanCostCents: 0,
      secondsRemaining: 0,
      totalCycleSeconds: Math.max(0, totalCycleSeconds)
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
    newPlanCostCents,
    secondsRemaining,
    totalCycleSeconds
  };
}

/**
 * Validates downgrade against active roster capacity.
 * Invariant:
 * 1. Active roster count cannot exceed target plan max seat cap (HTTP 422).
 * 2. Zero mid-cycle cash refunds; takes effect at currentPeriodEnd.
 */
export function validateDowngrade(params: {
  activeMemberCount: number;
  targetPlan: PlanTierName;
}): DowngradeValidationResult {
  const targetConfig = PLANS[params.targetPlan];
  const targetMaxCap = targetConfig.maxSeatCap;

  if (targetMaxCap !== null && params.activeMemberCount > targetMaxCap) {
    return {
      allowed: false,
      effectiveDate: 'CURRENT_PERIOD_END',
      refundCents: 0,
      targetMaxCap,
      activeMemberCount: params.activeMemberCount,
      error: {
        code: 'ROSTER_EXCEEDS_TARGET_PLAN_CAP',
        message: `Active roster (${params.activeMemberCount} members) exceeds target plan capacity (${targetMaxCap} seats). Deactivate members before downgrading.`,
        statusCode: 422
      }
    };
  }

  return {
    allowed: true,
    effectiveDate: 'CURRENT_PERIOD_END',
    refundCents: 0,
    targetMaxCap,
    activeMemberCount: params.activeMemberCount
  };
}
