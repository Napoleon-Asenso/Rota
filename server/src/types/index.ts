import { Request } from 'express';

export type Role = 'OWNER' | 'MANAGER' | 'STAFF';
export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type SwapStatus = 'OPEN_FOR_CLAIM' | 'PENDING_PEER_APPROVAL' | 'PENDING_MANAGER_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

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
