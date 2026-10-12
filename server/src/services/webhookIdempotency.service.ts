import crypto from 'crypto';
import { PrismaClient, LedgerType } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/prisma';
import { appendLedgerEntry } from './ledger.service';

/**
 * Safely verifies webhook signature using timingSafeEqual with length check.
 * Strictly adheres to Rule 12 in AGENTS.md.
 */
export function verifyWebhookSignature(providedSignature?: string, configuredSecret?: string): boolean {
  if (!providedSignature || !configuredSecret) {
    return false;
  }

  const sigBuffer = Buffer.from(providedSignature, 'utf8');
  const secretBuffer = Buffer.from(configuredSecret, 'utf8');

  // Hard Invariant: timingSafeEqual throws if lengths differ
  if (sigBuffer.length !== secretBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, secretBuffer);
}

export interface WebhookEventPayload {
  event: string;
  tx_ref: string;
  amountCents: number;
  teamId: string;
  description?: string;
}

/**
 * Idempotently processes payment webhooks.
 * Prevents double-charging or duplicate ledger debits when webhooks retry.
 */
export async function processWebhookIdempotent(
  payload: WebhookEventPayload,
  prismaClient: PrismaClient = defaultPrisma
) {
  const idempotencyKey = `webhook_${payload.tx_ref}`;

  // 1. Check if transaction has already been recorded
  const existingLedger = await prismaClient.ledgerEntry.findUnique({
    where: { idempotencyKey }
  });

  if (existingLedger) {
    return {
      status: 'IGNORED_DUPLICATE',
      alreadyProcessed: true,
      ledgerEntry: existingLedger
    };
  }

  // 2. Process and append immutable ledger record
  const ledgerEntry = await appendLedgerEntry(
    {
      teamId: payload.teamId,
      type: LedgerType.CHARGE,
      amountCents: payload.amountCents,
      description: payload.description || `Webhook payment: ${payload.event} (${payload.tx_ref})`,
      idempotencyKey
    },
    prismaClient
  );

  return {
    status: 'PROCESSED',
    alreadyProcessed: false,
    ledgerEntry
  };
}
