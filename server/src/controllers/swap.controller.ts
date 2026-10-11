import { Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthenticatedRequest, SwapStatus } from '../types';
import { store, SwapRecord } from '../services/store.service';

const CreateSwapSchema = z.object({
  sourceShiftId: z.string(),
  targetShiftId: z.string().optional().nullable(),
  targetUserId: z.string().optional().nullable(),
  notes: z.string().optional()
});

const ReviewSwapSchema = z.object({
  action: z.enum(['APPROVE', 'DENY']),
  reason: z.string().optional()
});

export function listSwapsHandler(req: AuthenticatedRequest, res: Response): void {
  const teamId = req.tenant?.teamId || 'team-rota-main';
  const swaps = Array.from(store.swaps.values()).filter(s => s.teamId === teamId);

  res.status(200).json({
    success: true,
    data: swaps
  });
}

export function createSwapHandler(req: AuthenticatedRequest, res: Response): void {
  const data = CreateSwapSchema.parse(req.body);
  const teamId = req.tenant?.teamId || 'team-rota-main';
  const initiatorId = req.tenant?.userId || 'user-emeka-1';

  // Verify Single Active Swap Invariant
  for (const swap of store.swaps.values()) {
    if (
      swap.sourceShiftId === data.sourceShiftId &&
      ['OPEN_FOR_CLAIM', 'PENDING_PEER_APPROVAL', 'PENDING_MANAGER_APPROVAL'].includes(swap.status)
    ) {
      res.status(409).json({
        success: false,
        error: {
          code: 'SHIFT_ALREADY_IN_ACTIVE_SWAP',
          message: 'This shift already has an active pending swap request.'
        }
      });
      return;
    }
  }

  const shift = store.shifts.get(data.sourceShiftId);
  const initiator = store.users.get(initiatorId);
  const targetUser = data.targetUserId ? store.users.get(data.targetUserId) : null;

  const initialStatus: SwapStatus = data.targetUserId ? 'PENDING_PEER_APPROVAL' : 'OPEN_FOR_CLAIM';

  const newSwap: SwapRecord = {
    id: crypto.randomUUID(),
    teamId,
    sourceShiftId: data.sourceShiftId,
    targetShiftId: data.targetShiftId || null,
    initiatorUserId: initiatorId,
    initiatorName: initiator?.fullName || 'Emeka Okafor',
    targetUserId: data.targetUserId || null,
    targetUserName: targetUser?.fullName || 'Marcus Vance',
    status: initialStatus,
    notes: data.notes,
    createdAt: new Date().toISOString()
  };

  store.swaps.set(newSwap.id, newSwap);

  // Activity Feed Record
  store.activities.unshift({
    id: crypto.randomUUID(),
    teamId,
    actorId: initiatorId,
    actorName: initiator?.fullName || 'Emeka Okafor',
    action: 'SWAP_REQUESTED',
    category: 'Swaps',
    title: 'Swap request',
    details: `${initiator?.fullName || 'Emeka'} requested swap for ${shift?.roleTitle || 'shift'}`,
    statusBadge: 'Awaiting approval',
    statusType: 'amber',
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    data: newSwap
  });
}

export function reviewSwapHandler(req: AuthenticatedRequest, res: Response): void {
  const swapId = req.params.swapId;
  const { action } = ReviewSwapSchema.parse(req.body);
  const teamId = req.tenant?.teamId || 'team-rota-main';

  const swap = store.swaps.get(swapId);
  if (!swap || swap.teamId !== teamId) {
    res.status(404).json({
      success: false,
      error: { code: 'SWAP_NOT_FOUND', message: 'Swap request not found.' }
    });
    return;
  }

  if (action === 'APPROVE') {
    swap.status = 'APPROVED';

    // Atomic shift reassignments
    const sourceShift = store.shifts.get(swap.sourceShiftId);
    if (sourceShift && swap.targetUserId) {
      sourceShift.assignedToId = swap.targetUserId;
      sourceShift.assignedToName = swap.targetUserName || undefined;
    }

    if (swap.targetShiftId && swap.initiatorUserId) {
      const targetShift = store.shifts.get(swap.targetShiftId);
      if (targetShift) {
        targetShift.assignedToId = swap.initiatorUserId;
        targetShift.assignedToName = swap.initiatorName;
      }
    }

    // Activity Feed Record
    store.activities.unshift({
      id: crypto.randomUUID(),
      teamId,
      actorId: req.tenant?.userId || 'user-marcus-1',
      actorName: 'Marcus Vance',
      action: 'SWAP_MANAGER_APPROVED',
      category: 'Swaps',
      title: 'Shift approved',
      details: `Swap request approved by Manager`,
      statusBadge: 'Approved',
      statusType: 'emerald',
      createdAt: new Date().toISOString()
    });
  } else {
    swap.status = 'REJECTED';
  }

  res.status(200).json({
    success: true,
    data: swap
  });
}
