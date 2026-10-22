import { z } from 'zod';

/**
 * ============================================================================
 * Settings & Notification Preferences Schemas
 * ============================================================================
 */

export const UpdateSettingsSchema = z.object({
  quietHoursStart: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'quietHoursStart must be in 24-hour HH:MM format (e.g. 22:00)')
    .optional(),
  quietHoursEnd: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'quietHoursEnd must be in 24-hour HH:MM format (e.g. 06:00)')
    .optional(),
  timezone: z.string().trim().min(1, 'Valid timezone identifier is required').optional(),
  pushShiftChanges: z.boolean().optional(),
  pushSwapRequests: z.boolean().optional(),
  pushApprovals: z.boolean().optional(),
  pushTeamMessages: z.boolean().optional()
});

export const RegisterDeviceTokenSchema = z.object({
  token: z.string().trim().min(1, 'Device token string is required'),
  platform: z.enum(['ios', 'android', 'web']).default('android')
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type RegisterDeviceTokenInput = z.infer<typeof RegisterDeviceTokenSchema>;
