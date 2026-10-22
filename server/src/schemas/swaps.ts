import { z } from 'zod';

/**
 * ============================================================================
 * Swaps Domain Schemas
 * ============================================================================
 */

export const CreateSwapSchema = z
  .object({
    shiftId: z.string().trim().optional(),
    sourceShiftId: z.string().trim().optional(),
    targetUserId: z.string().trim().nullable().optional(),
    targetShiftId: z.string().trim().nullable().optional(),
    reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
    notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional()
  })
  .refine((data) => Boolean(data.shiftId || data.sourceShiftId), {
    message: 'Either shiftId or sourceShiftId is required.',
    path: ['shiftId']
  });

export const ReviewSwapSchema = z.object({
  action: z.enum(['APPROVE', 'DENY', 'APPROVED', 'DENIED', 'ACCEPT', 'REJECT'], {
    errorMap: () => ({ message: "Action must be one of: 'APPROVE', 'DENY', 'ACCEPT', 'REJECT'" })
  }),
  managerNote: z.string().trim().max(500, 'Manager note cannot exceed 500 characters').optional(),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional()
});

export const SwapParamsSchema = z.object({
  id: z.string().trim().min(1, 'Swap ID parameter is required')
});

export type CreateSwapInput = z.infer<typeof CreateSwapSchema>;
export type ReviewSwapInput = z.infer<typeof ReviewSwapSchema>;
export type SwapParams = z.infer<typeof SwapParamsSchema>;
