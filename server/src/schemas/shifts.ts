import { z } from 'zod';

/**
 * ============================================================================
 * Shifts Domain Schemas
 * ============================================================================
 */

export const CreateShiftSchema = z
  .object({
    roleTitle: z.string().trim().min(1, 'Role title is required').max(100),
    startTime: z.string().trim().min(1, 'Start time is required'),
    endTime: z.string().trim().min(1, 'End time is required'),
    assignedToId: z.string().trim().nullable().optional(),
    venue: z.string().trim().optional(),
    location: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'Draft', 'Published', 'Scheduled']).optional()
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime();
      const end = new Date(data.endTime).getTime();
      return !isNaN(start) && !isNaN(end) && end > start;
    },
    {
      message: 'End time must be strictly after start time.',
      path: ['endTime']
    }
  );

export const PublishShiftsSchema = z.object({
  shiftIds: z.array(z.string().trim().min(1)).min(1, 'At least one shift ID is required to publish.')
});

export const ListShiftsQuerySchema = z.object({
  start: z.string().trim().optional(),
  end: z.string().trim().optional(),
  teamId: z.string().trim().optional(),
  assignedToId: z.string().trim().optional()
});

export const ShiftParamsSchema = z.object({
  id: z.string().trim().min(1, 'Shift ID parameter is required')
});

export type CreateShiftInput = z.infer<typeof CreateShiftSchema>;
export type PublishShiftsInput = z.infer<typeof PublishShiftsSchema>;
export type ListShiftsQuery = z.infer<typeof ListShiftsQuerySchema>;
export type ShiftParams = z.infer<typeof ShiftParamsSchema>;
