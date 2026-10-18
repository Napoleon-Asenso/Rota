import { Request } from 'express';

export const Role = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const ShiftStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  PUBLISHED: 'PUBLISHED',
  COMPLETED: 'COMPLETED',
} as const;
export type ShiftStatus = typeof ShiftStatus[keyof typeof ShiftStatus];

export const SwapStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  OPEN_FOR_CLAIM: 'OPEN_FOR_CLAIM',
  PENDING_PEER_APPROVAL: 'PENDING_PEER_APPROVAL',
  PENDING_MANAGER_APPROVAL: 'PENDING_MANAGER_APPROVAL',
} as const;
export type SwapStatus = typeof SwapStatus[keyof typeof SwapStatus];

export const LedgerType = {
  CHARGE: 'CHARGE',
  CREDIT: 'CREDIT',
  REFUND: 'REFUND',
} as const;
export type LedgerType = typeof LedgerType[keyof typeof LedgerType];

export interface AuthUserPayload {
  sub: string;
  email: string;
  teamId?: string;
  role?: Role;
  tokenVersion: number;
}

export interface TenantContext {
  teamId: string;
  role: Role;
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  tenant?: TenantContext;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
