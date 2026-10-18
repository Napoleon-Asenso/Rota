declare module 'date-fns' {
  export function differenceInSeconds(dateLeft: Date | number, dateRight: Date | number): number;
}

declare module 'date-fns-tz' {
  export function toZonedTime(date: Date | string | number, timeZone: string): Date;
  export function formatInTimeZone(date: Date | string | number, timeZone: string, format: string): string;
}

declare module '@prisma/client' {
  export * from '@prisma/client/default';

  export const Role: {
    readonly OWNER: 'OWNER';
    readonly MANAGER: 'MANAGER';
    readonly STAFF: 'STAFF';
  };
  export type Role = 'OWNER' | 'MANAGER' | 'STAFF';

  export const LedgerType: {
    readonly CHARGE: 'CHARGE';
    readonly CREDIT: 'CREDIT';
    readonly REFUND: 'REFUND';
  };
  export type LedgerType = 'CHARGE' | 'CREDIT' | 'REFUND';

  export const PlanTier: {
    readonly STARTER: 'STARTER';
    readonly TEAM: 'TEAM';
    readonly BUSINESS: 'BUSINESS';
  };
  export type PlanTier = 'STARTER' | 'TEAM' | 'BUSINESS';

  export const ShiftStatus: {
    readonly SCHEDULED: 'SCHEDULED';
    readonly CONFIRMED: 'CONFIRMED';
    readonly CANCELLED: 'CANCELLED';
    readonly DRAFT: 'DRAFT';
    readonly PUBLISHED: 'PUBLISHED';
    readonly COMPLETED: 'COMPLETED';
  };
  export type ShiftStatus = 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'DRAFT' | 'PUBLISHED' | 'COMPLETED';

  export const SwapStatus: {
    readonly PENDING: 'PENDING';
    readonly APPROVED: 'APPROVED';
    readonly REJECTED: 'REJECTED';
    readonly CANCELLED: 'CANCELLED';
    readonly OPEN_FOR_CLAIM: 'OPEN_FOR_CLAIM';
    readonly PENDING_PEER_APPROVAL: 'PENDING_PEER_APPROVAL';
    readonly PENDING_MANAGER_APPROVAL: 'PENDING_MANAGER_APPROVAL';
  };
  export type SwapStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'OPEN_FOR_CLAIM' | 'PENDING_PEER_APPROVAL' | 'PENDING_MANAGER_APPROVAL';
}
