import { PrismaClient, LedgerType } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/prisma';

export interface CreateLedgerEntryInput {
  teamId: string;
  type: LedgerType;
  amountCents: number;
  description: string;
  idempotencyKey: string;
}

export interface LedgerEntryRecord {
  id: string;
  teamId: string;
  type: LedgerType;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  idempotencyKey: string;
  createdAt: Date;
}

/**
 * Appends an immutable record to the directional financial ledger.
 * Invariant: Rows in ledger_entries can NEVER be updated or deleted.
 * Idempotency: Duplicate calls with the same idempotencyKey safely return the existing record.
 */
export async function appendLedgerEntry(
  input: CreateLedgerEntryInput,
  prismaClient: PrismaClient = defaultPrisma
): Promise<LedgerEntryRecord> {
  // 1. Idempotency check: if entry already exists, replay safely
  const existing = await prismaClient.ledgerEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey }
  });

  if (existing) {
    return existing;
  }

  // 2. Transactionally fetch prior balance and append entry
  return await prismaClient.$transaction(async (tx) => {
    // Double-check inside transaction
    const existingInTx = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existingInTx) {
      return existingInTx;
    }

    const lastEntry = await tx.ledgerEntry.findFirst({
      where: { teamId: input.teamId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfterCents: true }
    });

    const previousBalance = lastEntry?.balanceAfterCents ?? 0;
    const balanceAfterCents =
      input.type === LedgerType.CHARGE
        ? previousBalance + input.amountCents
        : previousBalance - input.amountCents;

    return await tx.ledgerEntry.create({
      data: {
        teamId: input.teamId,
        type: input.type,
        amountCents: input.amountCents,
        balanceAfterCents,
        description: input.description,
        idempotencyKey: input.idempotencyKey
      }
    });
  });
}

/**
 * Retrieves the append-only ledger entries for a tenant in descending order.
 */
export async function getTeamLedger(
  teamId: string,
  prismaClient: PrismaClient = defaultPrisma
): Promise<LedgerEntryRecord[]> {
  return await prismaClient.ledgerEntry.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' }
  });
}
