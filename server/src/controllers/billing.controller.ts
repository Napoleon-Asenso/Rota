import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../db/prisma';
import { PLANS, PlanTierName } from '../services/billingConstants';
import { purchaseAdditionalSeats, verifySeatCapacity } from '../services/seatEnforcement.service';
import { processWebhookIdempotent, verifyWebhookSignature } from '../services/webhookIdempotency.service';

const UpdateSeatsSchema = z.object({
  additionalSeats: z.number().int().min(1, 'additionalSeats must be at least 1'),
  idempotencyKey: z.string().optional()
});

const WebhookBodySchema = z.object({
  event: z.string(),
  data: z.object({
    tx_ref: z.string(),
    amount: z.number(), // in major units or integer
    status: z.string()
  }),
  teamId: z.string().optional()
});

export async function getSubscriptionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teamId = (req.params.teamId as string) || req.user?.teamId || req.tenant?.teamId || 'team-rota-main';

  const sub = await prisma.subscription.findUnique({
    where: { teamId }
  });

  const activeMembersCount = await prisma.membership.count({
    where: { teamId }
  });

  const tier = (sub?.tier as PlanTierName) || 'TEAM';
  const planConfig = PLANS[tier] || PLANS.TEAM;

  const totalSeats = sub?.seatCount || 10;
  const consumedSeats = activeMembersCount || 5;

  res.status(200).json({
    success: true,
    data: {
      planName: `${tier.charAt(0) + tier.slice(1).toLowerCase()} Plan`,
      tier,
      basePriceCents: planConfig.basePriceCents,
      extraSeatPriceCents: planConfig.extraSeatCents,
      displayPrice: `$${(planConfig.basePriceCents / 100).toFixed(0)} / month`,
      billingInterval: `Billed monthly · ${planConfig.includedSeats} included seats`,
      features: [
        'Shift scheduling & swaps',
        'Composite cursor activity feed',
        'Timezone quiet-hours digest',
        'Encrypted offline shift cache'
      ],
      usage: {
        consumedSeats,
        totalSeats,
        availableSeats: Math.max(0, totalSeats - consumedSeats),
        label: `Current Usage: ${consumedSeats} / ${totalSeats} seats`
      }
    }
  });
}

export async function updateSeatsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { additionalSeats, idempotencyKey } = UpdateSeatsSchema.parse(req.body);
  const teamId = (req.params.teamId as string) || req.user?.teamId || req.tenant?.teamId;

  if (!teamId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Team context required.' }
    });
    return;
  }

  const generatedKey = idempotencyKey || `seat_add_${teamId}_${Date.now()}_${additionalSeats}`;

  try {
    const result = await purchaseAdditionalSeats({
      teamId,
      additionalSeats,
      idempotencyKey: generatedKey
    });

    res.status(200).json({
      success: true,
      data: {
        totalSeats: result.subscription.seatCount,
        proratedChargeCents: result.proratedChargeCents,
        ledgerEntryId: result.ledgerEntry.id,
        message: `Successfully purchased ${additionalSeats} additional seats.`
      }
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Seat purchase failed.' }
    });
  }
}

export async function handleBillingWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['verif-hash'] as string | undefined;
  const configuredSecret = process.env.FLUTTERWAVE_SECRET_HASH || 'test_flw_secret_hash_value';

  if (!verifyWebhookSignature(signature, configuredSecret)) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' }
    });
    return;
  }

  const parsed = WebhookBodySchema.parse(req.body);
  const teamId = parsed.teamId || 'team-default';
  const amountCents = Math.round(parsed.data.amount * 100);

  const result = await processWebhookIdempotent({
    event: parsed.event,
    tx_ref: parsed.data.tx_ref,
    amountCents,
    teamId
  });

  res.status(200).json({
    success: true,
    data: result
  });
}
