import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../db/prisma';
import { getShardClient } from '../db/sharding';
import {
  getCachedShifts,
  setCachedShifts,
  invalidateTeamShiftCache
} from '../services/shiftCache.service';

const ListShiftsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const CreateShiftSchema = z.object({
  userId: z.string().optional(),
  assignedToId: z.string().optional(),
  roleTitle: z.string().min(1, 'Role title is required'),
  location: z.string().optional(),
  venue: z.string().optional(),
  startTime: z.string().datetime('startTime must be a valid ISO datetime string'),
  endTime: z.string().datetime('endTime must be a valid ISO datetime string'),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).optional().default('SCHEDULED')
});

const RequestSwapSchema = z.object({
  shiftId: z.string().min(1, 'shiftId is required'),
  targetUserId: z.string().optional().nullable(),
  reason: z.string().optional()
});

/**
 * GET /api/shifts
 * Fetch shifts for the authenticated user's teamId, optionally filtered by date range.
 * Employs Redis Cache-Aside (<2ms hit) and routes cache-misses to the sharded/replica client.
 */
export async function getShifts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teamId = req.user?.teamId || req.tenant?.teamId;
  if (!teamId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Team context missing from session.' }
    });
    return;
  }

  const query = ListShiftsQuerySchema.parse(req.query);

  // 1. Redis Cache-Aside: Check cached response first
  const cached = await getCachedShifts(teamId, query.startDate, query.endDate);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.status(200).json({
      success: true,
      data: cached
    });
    return;
  }

  // 2. Cache Miss: Route to appropriate sharded / replica DB client
  const db = (req as any).db || getShardClient(teamId);
  const start = query.startDate ? new Date(query.startDate) : undefined;
  const end = query.endDate ? new Date(query.endDate) : undefined;

  const shifts = await db.shift.findMany({
    where: {
      teamId,
      ...(start || end
        ? {
            startTime: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      swapRequests: {
        where: { status: 'PENDING' }
      }
    },
    orderBy: { startTime: 'asc' }
  });

  const formatted = shifts.map((shift: any) => ({
    ...shift,
    assignedToId: shift.userId,
    assignedToName: shift.user?.fullName,
    venue: shift.location,
    hasActiveSwap: shift.swapRequests.length > 0
  }));

  // 3. Populate Redis Cache (TTL: 60s)
  await setCachedShifts(teamId, formatted, query.startDate, query.endDate);
  res.setHeader('X-Cache', 'MISS');

  res.status(200).json({
    success: true,
    data: formatted
  });
}

/**
 * POST /api/shifts
 * Create new shift (restricted to OWNER and MANAGER roles). Creates an Activity record.
 */
export async function createShift(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teamId = req.user?.teamId || req.tenant?.teamId;
  const actorId = req.user?.sub || req.tenant?.userId;
  const role = req.user?.role || req.tenant?.role;

  if (!teamId || !actorId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'User or team context missing.' }
    });
    return;
  }

  if (role !== 'OWNER' && role !== 'MANAGER') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: 'Only team Owners and Managers can create shifts.'
      }
    });
    return;
  }

  const parsed = CreateShiftSchema.parse(req.body);
  const targetUserId = parsed.userId || parsed.assignedToId || actorId;
  const location = parsed.location || parsed.venue || 'Main Floor';

  const startTimeDate = new Date(parsed.startTime);
  const endTimeDate = new Date(parsed.endTime);

  if (endTimeDate <= startTimeDate) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SHIFT_TIMES',
        message: 'Shift end time must be chronologically after start time.'
      }
    });
    return;
  }

  // Conflict Detection: (start_new < end_existing) AND (end_new > start_existing)
  const overlappingShift = await prisma.shift.findFirst({
    where: {
      teamId,
      userId: targetUserId,
      status: { not: 'CANCELLED' },
      startTime: { lt: endTimeDate },
      endTime: { gt: startTimeDate }
    }
  });

  if (overlappingShift) {
    res.status(409).json({
      success: false,
      error: {
        code: 'STAFF_ALREADY_SCHEDULED',
        message: 'The selected staff member has an overlapping shift.',
        details: { overlappingShiftId: overlappingShift.id }
      }
    });
    return;
  }

  // Atomic creation of Shift and Activity record
  const [newShift, activity] = await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.create({
      data: {
        teamId,
        userId: targetUserId,
        roleTitle: parsed.roleTitle,
        location,
        startTime: startTimeDate,
        endTime: endTimeDate,
        status: parsed.status
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    const act = await tx.activity.create({
      data: {
        teamId,
        actorId,
        type: 'SHIFT_PUBLISHED',
        description: `New shift scheduled: ${shift.roleTitle} at ${location}`,
        metadata: JSON.stringify({
          shiftId: shift.id,
          roleTitle: shift.roleTitle,
          location: shift.location,
          assignedToId: shift.userId,
          startTime: shift.startTime.toISOString(),
          endTime: shift.endTime.toISOString()
        })
      }
    });

    return [shift, act];
  });

  // Invalidate Redis shift cache for this team
  await invalidateTeamShiftCache(teamId);

  res.status(201).json({
    success: true,
    data: {
      ...newShift,
      assignedToId: newShift.userId,
      assignedToName: newShift.user?.fullName,
      venue: newShift.location
    }
  });
}

/**
 * POST /api/swaps/request
 * Create a shift swap request. Creates an Activity record with type SWAP_REQUEST.
 */
export async function requestSwap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teamId = req.user?.teamId || req.tenant?.teamId;
  const requesterId = req.user?.sub || req.tenant?.userId;

  if (!teamId || !requesterId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
    });
    return;
  }

  const data = RequestSwapSchema.parse(req.body);

  // Check shift existence within the authenticated tenant
  const shift = await prisma.shift.findFirst({
    where: {
      id: data.shiftId,
      teamId
    },
    include: {
      user: true
    }
  });

  if (!shift) {
    res.status(404).json({
      success: false,
      error: {
        code: 'SHIFT_NOT_FOUND',
        message: 'The requested shift was not found in your team.'
      }
    });
    return;
  }

  // Invariant: NEVER allow double-swaps on the same shift
  const activeSwap = await prisma.shiftSwapRequest.findFirst({
    where: {
      shiftId: data.shiftId,
      status: 'PENDING'
    }
  });

  if (activeSwap) {
    res.status(409).json({
      success: false,
      error: {
        code: 'SHIFT_ALREADY_IN_ACTIVE_SWAP',
        message: 'This shift already has an active pending swap request.'
      }
    });
    return;
  }

  // Create Swap Request and Activity record
  const [newSwap, activity] = await prisma.$transaction(async (tx) => {
    const swap = await tx.shiftSwapRequest.create({
      data: {
        shiftId: data.shiftId,
        requesterId,
        targetUserId: data.targetUserId || null,
        reason: data.reason || 'Shift swap request',
        status: 'PENDING'
      },
      include: {
        shift: true,
        requester: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } }
      }
    });

    const act = await tx.activity.create({
      data: {
        teamId,
        actorId: requesterId,
        type: 'SWAP_REQUEST',
        description: `${swap.requester.fullName} requested swap for ${shift.roleTitle}`,
        metadata: JSON.stringify({
          swapId: swap.id,
          shiftId: shift.id,
          targetUserId: data.targetUserId || null
        })
      }
    });

    return [swap, act];
  });

  res.status(201).json({
    success: true,
    data: newSwap
  });
}

/**
 * POST /api/swaps/:id/approve
 * Approve swap and reassign shift (restricted to OWNER and MANAGER).
 */
export async function approveSwap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teamId = req.user?.teamId || req.tenant?.teamId;
  const actorId = req.user?.sub || req.tenant?.userId;
  const role = req.user?.role || req.tenant?.role;
  const swapId = req.params.id || req.params.swapId;

  if (!teamId || !actorId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
    });
    return;
  }

  if (role !== 'OWNER' && role !== 'MANAGER') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: 'Only team Owners and Managers can approve shift swaps.'
      }
    });
    return;
  }

  const existingSwap = await prisma.shiftSwapRequest.findFirst({
    where: {
      id: swapId,
      shift: { teamId }
    },
    include: {
      shift: true,
      requester: true,
      targetUser: true
    }
  });

  if (!existingSwap) {
    res.status(404).json({
      success: false,
      error: {
        code: 'SWAP_NOT_FOUND',
        message: 'Shift swap request not found within this team.'
      }
    });
    return;
  }

  if (existingSwap.status !== 'PENDING') {
    res.status(409).json({
      success: false,
      error: {
        code: 'SWAP_NOT_PENDING',
        message: `Shift swap cannot be approved because current status is ${existingSwap.status}.`
      }
    });
    return;
  }

  // Atomic reassignment and activity creation
  const [updatedSwap, updatedShift, activity] = await prisma.$transaction(async (tx) => {
    const approvedSwap = await tx.shiftSwapRequest.update({
      where: { id: swapId },
      data: { status: 'APPROVED' },
      include: {
        shift: true,
        requester: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } }
      }
    });

    // Reassign shift to the targeted coworker or new claimant
    const newAssigneeId = approvedSwap.targetUserId || approvedSwap.requesterId;
    const reallocatedShift = await tx.shift.update({
      where: { id: approvedSwap.shiftId },
      data: { userId: newAssigneeId },
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    });

    const act = await tx.activity.create({
      data: {
        teamId,
        actorId,
        type: 'SWAP_APPROVED',
        description: `Swap request approved for ${approvedSwap.shift.roleTitle}`,
        metadata: JSON.stringify({
          swapId: approvedSwap.id,
          shiftId: approvedSwap.shiftId,
          reassignedToId: newAssigneeId,
          reassignedToName: reallocatedShift.user.fullName
        })
      }
    });

    return [approvedSwap, reallocatedShift, act];
  });

  // Invalidate Redis shift cache for this team
  await invalidateTeamShiftCache(teamId);

  res.status(200).json({
    success: true,
    data: {
      swap: updatedSwap,
      reassignedShift: updatedShift
    }
  });
}
