import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { store } from '../services/store.service';

const UpdateSeatsSchema = z.object({
  additionalSeats: z.number().int().min(1)
});

export function getSubscriptionHandler(req: AuthenticatedRequest, res: Response): void {
  const teamId = (req.params.teamId as string) || req.tenant?.teamId || 'team-rota-main';
  const sub = store.subscriptions.get(teamId) || {
    teamId,
    planName: 'Pro Plan',
    pricePerSeatCents: 1200, // $12 / seat / month
    billingInterval: 'monthly',
    baseSeats: 5,
    totalSeats: 10,
    consumedSeats: 5,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString()
  };

  res.status(200).json({
    success: true,
    data: {
      planName: sub.planName,
      pricePerSeatCents: sub.pricePerSeatCents,
      displayPrice: `$${(sub.pricePerSeatCents / 100).toFixed(0)} / seat / month`,
      billingInterval: 'Billed monthly · 5 seats',
      features: [
        'Shift scheduling',
        'Swap requests',
        'Push notifications',
        'Offline access'
      ],
      usage: {
        consumedSeats: sub.consumedSeats,
        totalSeats: sub.totalSeats,
        label: `Current Usage: ${sub.consumedSeats} / ${sub.totalSeats} seats`
      }
    }
  });
}

export function updateSeatsHandler(req: AuthenticatedRequest, res: Response): void {
  const { additionalSeats } = UpdateSeatsSchema.parse(req.body);
  const teamId = (req.params.teamId as string) || req.tenant?.teamId || 'team-rota-main';
  const sub = store.subscriptions.get(teamId);

  if (!sub) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
    return;
  }

  // Integer cent proration: Math.floor(...)
  const proratedChargeCents = Math.floor(additionalSeats * sub.pricePerSeatCents * 0.7);
  sub.totalSeats += additionalSeats;

  res.status(200).json({
    success: true,
    data: {
      totalSeats: sub.totalSeats,
      proratedChargeCents,
      message: `Added ${additionalSeats} seats successfully.`
    }
  });
}
