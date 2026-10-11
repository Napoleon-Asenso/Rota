import { Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthenticatedRequest, ShiftStatus } from '../types';
import { store, ShiftRecord } from '../services/store.service';

const CreateShiftSchema = z.object({
  assignedToId: z.string().optional().nullable(),
  roleTitle: z.string().min(1),
  venue: z.string().default('Main Floor'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT')
});

const PublishShiftsSchema = z.object({
  shiftIds: z.array(z.string())
});

export function listShiftsHandler(req: AuthenticatedRequest, res: Response): void {
  const teamId = req.tenant?.teamId || 'team-rota-main';
  const shifts = Array.from(store.shifts.values()).filter(s => s.teamId === teamId);

  res.status(200).json({
    success: true,
    data: shifts
  });
}

export function createShiftHandler(req: AuthenticatedRequest, res: Response): void {
  const data = CreateShiftSchema.parse(req.body);
  const teamId = req.tenant?.teamId || 'team-rota-main';
  const createdById = req.tenant?.userId || 'user-marcus-1';

  // Check temporal validity
  const start = new Date(data.startTime).getTime();
  const end = new Date(data.endTime).getTime();
  if (end <= start) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_SHIFT_TIMES', message: 'End time must be after start time.' }
    });
    return;
  }

  // Conflict Detection: (start_new < end_existing) AND (end_new > start_existing)
  if (data.assignedToId) {
    const hasConflict = store.hasShiftOverlap(data.assignedToId, data.startTime, data.endTime);
    if (hasConflict) {
      res.status(409).json({
        success: false,
        error: {
          code: 'STAFF_ALREADY_SCHEDULED',
          message: 'The selected staff member has an overlapping shift during this timeframe.'
        }
      });
      return;
    }
  }

  const assignedUser = data.assignedToId ? store.users.get(data.assignedToId) : undefined;

  const newShift: ShiftRecord = {
    id: crypto.randomUUID(),
    teamId,
    assignedToId: data.assignedToId || null,
    assignedToName: assignedUser?.fullName,
    createdById,
    roleTitle: data.roleTitle,
    venue: data.venue,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status as ShiftStatus,
    notes: data.notes,
    createdAt: new Date().toISOString()
  };

  store.shifts.set(newShift.id, newShift);

  res.status(201).json({
    success: true,
    data: newShift
  });
}

export function publishShiftsHandler(req: AuthenticatedRequest, res: Response): void {
  const { shiftIds } = PublishShiftsSchema.parse(req.body);
  const teamId = req.tenant?.teamId || 'team-rota-main';

  const updated: ShiftRecord[] = [];
  for (const id of shiftIds) {
    const shift = store.shifts.get(id);
    if (shift && shift.teamId === teamId) {
      shift.status = 'PUBLISHED';
      updated.push(shift);
    }
  }

  // Record activity feed event
  store.activities.unshift({
    id: crypto.randomUUID(),
    teamId,
    actorId: req.tenant?.userId || 'user-marcus-1',
    actorName: 'Marcus Vance',
    action: 'SHIFT_PUBLISHED',
    category: 'Shifts',
    title: 'New shift published',
    details: `${updated.length} shifts published by Marcus`,
    createdAt: new Date().toISOString()
  });

  res.status(200).json({
    success: true,
    data: { publishedCount: updated.length, shifts: updated }
  });
}
