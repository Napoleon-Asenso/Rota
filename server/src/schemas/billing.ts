import { z } from 'zod';

/**
 * ============================================================================
 * Billing & Webhook Schemas
 * ============================================================================
 */

export const UpdateSeatsSchema = z.object({
  additionalSeats: z.number().int().positive('additionalSeats must be a positive whole integer.'),
  idempotencyKey: z.string().trim().optional()
});

export const WebhookBodySchema = z.object({
  event: z.string().trim().min(1, 'Webhook event name is required'),
  teamId: z.string().trim().optional(),
  data: z.object({
    tx_ref: z.string().trim().min(1, 'Transaction reference tx_ref is required'),
    amount: z.number().positive('Payment amount must be positive'),
    status: z.string().optional(),
    currency: z.string().optional(),
    customer: z
      .object({
        email: z.string().email().optional(),
        name: z.string().optional()
      })
      .optional()
  })
});

export type UpdateSeatsInput = z.infer<typeof UpdateSeatsSchema>;
export type WebhookBodyInput = z.infer<typeof WebhookBodySchema>;
