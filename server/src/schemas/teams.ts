import { z } from 'zod';

/**
 * ============================================================================
 * Teams & Members Domain Schemas
 * ============================================================================
 */

export const InviteMemberSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).default('STAFF'),
  teamId: z.string().trim().optional()
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'STAFF'], {
    errorMap: () => ({ message: "Role must be 'OWNER', 'MANAGER', or 'STAFF'" })
  })
});

export const MemberParamsSchema = z.object({
  id: z.string().trim().min(1, 'Member ID parameter is required')
});

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
export type MemberParams = z.infer<typeof MemberParamsSchema>;
