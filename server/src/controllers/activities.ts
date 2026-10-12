import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../db/prisma';
import { decodeCursor, encodeCursor } from '../utils/cursor';

const GetActivitiesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional()
});

/**
 * GET /api/activities
 * High-performance composite cursor pagination supporting O(1) index seeks.
 */
export async function getActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
  const teamId = req.user?.teamId || req.tenant?.teamId;

  if (!teamId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Team context required.' }
    });
    return;
  }

  const query = GetActivitiesQuerySchema.parse(req.query);
  const limit = query.limit;
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const typeFilter = query.type && query.type !== 'All' ? query.type : undefined;

  const cursorCreatedAt = cursorData ? new Date(cursorData.createdAt) : null;

  const records = await prisma.activity.findMany({
    where: {
      teamId,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(cursorData && cursorCreatedAt
        ? {
            OR: [
              { createdAt: { lt: cursorCreatedAt } },
              { createdAt: cursorCreatedAt, id: { lt: cursorData.id } }
            ]
          }
        : {})
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    take: limit + 1,
    include: {
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });

  const hasNextPage = records.length > limit;
  const items = hasNextPage ? records.slice(0, limit) : records;
  const lastItem = items[items.length - 1];

  const nextCursor = hasNextPage && lastItem
    ? encodeCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
    : null;

  const formattedItems = items.map((item) => {
    // Determine category and human-readable attributes
    let category: 'Shifts' | 'Swaps' | 'Changes' = 'Changes';
    if (item.type.includes('SHIFT')) category = 'Shifts';
    else if (item.type.includes('SWAP')) category = 'Swaps';

    let badge: { label: string; text: string; bg: string } | undefined;
    if (item.type === 'SWAP_REQUEST') {
      badge = { label: 'Awaiting approval', text: '#D97706', bg: '#FFFBEB' };
    } else if (item.type === 'SWAP_APPROVED') {
      badge = { label: 'Approved', text: '#059669', bg: '#ECFDF5' };
    }

    return {
      id: item.id,
      teamId: item.teamId,
      actorId: item.actorId,
      actorName: item.actor?.fullName || 'System',
      type: item.type,
      category,
      title: item.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      details: item.description,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
      badge
    };
  });

  res.status(200).json({
    success: true,
    data: {
      items: formattedItems,
      nextCursor,
      hasNextPage,
      hasMore: hasNextPage // backward-compatible alias
    }
  });
}
