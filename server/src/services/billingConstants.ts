export const PLANS = {
  STARTER: {
    basePriceCents: 2000,
    includedSeats: 5,
    extraSeatCents: null,
    maxSeatCap: 5
  },
  TEAM: {
    basePriceCents: 5000,
    includedSeats: 15,
    extraSeatCents: 300,
    maxSeatCap: 35
  },
  BUSINESS: {
    basePriceCents: 12000,
    includedSeats: 40,
    extraSeatCents: 200,
    maxSeatCap: null
  }
} as const;

export type PlanTierName = keyof typeof PLANS;

export interface PlanConfig {
  basePriceCents: number;
  includedSeats: number;
  extraSeatCents: number | null;
  maxSeatCap: number | null;
}
