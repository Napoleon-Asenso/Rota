import crypto from 'crypto';
import { Role, ShiftStatus, SwapStatus } from '../types';
import { encodeCursor, decodeCursor } from '../utils/cursor';

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  teamId: string;
  timezone: string;
  tokenVersion: number;
}

export interface ShiftRecord {
  id: string;
  teamId: string;
  assignedToId: string | null;
  assignedToName?: string;
  createdById: string;
  roleTitle: string;
  venue: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: ShiftStatus;
  notes?: string;
  createdAt: string;
}

export interface SwapRecord {
  id: string;
  teamId: string;
  sourceShiftId: string;
  targetShiftId?: string | null;
  initiatorUserId: string;
  initiatorName: string;
  targetUserId?: string | null;
  targetUserName?: string | null;
  status: SwapStatus;
  notes?: string;
  createdAt: string;
}

export interface ActivityRecord {
  id: string;
  teamId: string;
  actorId: string;
  actorName: string;
  action: string;
  category: 'Shifts' | 'Swaps' | 'Changes' | 'Members';
  title: string;
  details: string;
  statusBadge?: string;
  statusType?: 'amber' | 'emerald' | 'blue';
  createdAt: string;
}

export interface MemberRecord {
  id: string;
  teamId: string;
  userId: string;
  fullName: string;
  email: string;
  role: Role;
  status: 'Active' | 'Pending' | 'Invited';
  avatar?: string;
}

export interface SubscriptionRecord {
  teamId: string;
  planName: string;
  pricePerSeatCents: number; // 1200 ($12)
  billingInterval: 'monthly' | 'yearly';
  baseSeats: number;
  totalSeats: number; // 10
  consumedSeats: number; // 5
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

class InMemoryDomainStore {
  public users: Map<string, UserRecord> = new Map();
  public shifts: Map<string, ShiftRecord> = new Map();
  public swaps: Map<string, SwapRecord> = new Map();
  public activities: ActivityRecord[] = [];
  public members: Map<string, MemberRecord> = new Map();
  public subscriptions: Map<string, SubscriptionRecord> = new Map();
  public refreshTokens: Map<string, { userId: string; familyId: string; isRevoked: boolean; expiresAt: Date }> = new Map();
  public graceTokens: Map<string, { replacementHash: string; expiresAt: number }> = new Map();

  constructor() {
    this.seedInitialState();
  }

  private seedInitialState(): void {
    const defaultTeamId = 'team-rota-main';
    
    // Seed primary user Emeka Okafor from UI specification
    const emekaId = 'user-emeka-1';
    this.users.set(emekaId, {
      id: emekaId,
      email: 'emeka.okafor@example.com',
      fullName: 'Emeka Okafor',
      role: 'STAFF',
      teamId: defaultTeamId,
      timezone: 'UTC',
      tokenVersion: 1
    });

    const managerId = 'user-marcus-1';
    this.users.set(managerId, {
      id: managerId,
      email: 'marcus.lead@example.com',
      fullName: 'Marcus Vance',
      role: 'MANAGER',
      teamId: defaultTeamId,
      timezone: 'UTC',
      tokenVersion: 1
    });

    const ownerId = 'user-elena-1';
    this.users.set(ownerId, {
      id: ownerId,
      email: 'elena.owner@example.com',
      fullName: 'Elena Rostova',
      role: 'OWNER',
      teamId: defaultTeamId,
      timezone: 'UTC',
      tokenVersion: 1
    });

    // Seed team members for Screen 5 (Team & Role Management: 5 members · 3 roles)
    const membersList: MemberRecord[] = [
      { id: 'mem-1', teamId: defaultTeamId, userId: ownerId, fullName: 'Elena Rostova', email: 'elena.owner@example.com', role: 'OWNER', status: 'Active' },
      { id: 'mem-2', teamId: defaultTeamId, userId: managerId, fullName: 'Marcus Vance', email: 'marcus.lead@example.com', role: 'MANAGER', status: 'Active' },
      { id: 'mem-3', teamId: defaultTeamId, userId: emekaId, fullName: 'Emeka Okafor', email: 'emeka.okafor@example.com', role: 'STAFF', status: 'Active' },
      { id: 'mem-4', teamId: defaultTeamId, userId: 'user-jane-1', fullName: 'Jane Doe', email: 'jane@company.com', role: 'STAFF', status: 'Pending' },
      { id: 'mem-5', teamId: defaultTeamId, userId: 'user-alex-1', fullName: 'Alex Rivera', email: 'alex@company.com', role: 'STAFF', status: 'Invited' }
    ];
    membersList.forEach(m => this.members.set(m.id, m));

    // Seed Subscription for Screen 6 ($12 / seat / month, 5 / 10 seats)
    this.subscriptions.set(defaultTeamId, {
      teamId: defaultTeamId,
      planName: 'Pro Plan',
      pricePerSeatCents: 1200, // $12.00
      billingInterval: 'monthly',
      baseSeats: 5,
      totalSeats: 10,
      consumedSeats: 5,
      currentPeriodStart: new Date(Date.now() - 10 * 86400000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString()
    });

    // Seed Shifts for Screen 7 (09:00 - 17:00, Waiter · Main Floor, Confirmed)
    const baseDate = new Date();
    baseDate.setHours(9, 0, 0, 0);
    const endDate = new Date(baseDate);
    endDate.setHours(17, 0, 0, 0);

    const shift1: ShiftRecord = {
      id: 'shift-1',
      teamId: defaultTeamId,
      assignedToId: emekaId,
      assignedToName: 'Emeka Okafor',
      createdById: managerId,
      roleTitle: 'Waiter',
      venue: 'Main Floor',
      startTime: baseDate.toISOString(),
      endTime: endDate.toISOString(),
      status: 'PUBLISHED',
      notes: 'Lunch and dinner floor rush coverage',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    };
    this.shifts.set(shift1.id, shift1);

    // Additional shift for tomorrow
    const tomStart = new Date(baseDate);
    tomStart.setDate(tomStart.getDate() + 1);
    const tomEnd = new Date(tomStart);
    tomEnd.setHours(17, 0, 0, 0);

    const shift2: ShiftRecord = {
      id: 'shift-2',
      teamId: defaultTeamId,
      assignedToId: emekaId,
      assignedToName: 'Emeka Okafor',
      createdById: managerId,
      roleTitle: 'Waiter',
      venue: 'Main Floor',
      startTime: tomStart.toISOString(),
      endTime: tomEnd.toISOString(),
      status: 'PUBLISHED',
      notes: 'Evening dining setup',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    };
    this.shifts.set(shift2.id, shift2);

    // Seed Activity items for Screen 8
    this.activities.push(
      {
        id: crypto.randomUUID(),
        teamId: defaultTeamId,
        actorId: managerId,
        actorName: 'Marcus Vance',
        action: 'SHIFT_PUBLISHED',
        category: 'Shifts',
        title: 'New shift published',
        details: 'Marcus published 09:00 - 17:00 Waiter · Main Floor',
        createdAt: new Date(Date.now() - 2 * 60000).toISOString() // 2m ago
      },
      {
        id: crypto.randomUUID(),
        teamId: defaultTeamId,
        actorId: emekaId,
        actorName: 'Emeka Okafor',
        action: 'SWAP_REQUESTED',
        category: 'Swaps',
        title: 'Swap request',
        details: 'Emeka requested swap with Marcus',
        statusBadge: 'Awaiting approval',
        statusType: 'amber',
        createdAt: new Date(Date.now() - 15 * 60000).toISOString() // 15m ago
      },
      {
        id: crypto.randomUUID(),
        teamId: defaultTeamId,
        actorId: managerId,
        actorName: 'Marcus Vance',
        action: 'SWAP_MANAGER_APPROVED',
        category: 'Swaps',
        title: 'Shift approved',
        details: 'Swap request approved by Manager',
        statusBadge: 'Approved',
        statusType: 'emerald',
        createdAt: new Date(Date.now() - 60 * 60000).toISOString() // 1h ago
      },
      {
        id: crypto.randomUUID(),
        teamId: defaultTeamId,
        actorId: ownerId,
        actorName: 'Elena Rostova',
        action: 'MEMBER_JOINED',
        category: 'Changes',
        title: 'Team member joined',
        details: 'Jane Doe accepted the invite',
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString() // 3h ago
      }
    );
  }

  // Conflict Detection: (start_new < end_existing) AND (end_new > start_existing)
  public hasShiftOverlap(userId: string, startTimeIso: string, endTimeIso: string, excludeShiftId?: string): boolean {
    const newStart = new Date(startTimeIso).getTime();
    const newEnd = new Date(endTimeIso).getTime();

    for (const shift of this.shifts.values()) {
      if (shift.id === excludeShiftId) continue;
      if (shift.assignedToId === userId && shift.status !== 'CANCELLED') {
        const existStart = new Date(shift.startTime).getTime();
        const existEnd = new Date(shift.endTime).getTime();
        if (newStart < existEnd && newEnd > existStart) {
          return true;
        }
      }
    }
    return false;
  }

  // Activity Feed Cursor Seek
  public getActivityFeed(teamId: string, category?: string, cursor?: string, limit: number = 25) {
    let filtered = this.activities.filter(a => a.teamId === teamId);
    if (category && category !== 'All') {
      filtered = filtered.filter(a => a.category === category);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const decoded = cursor ? decodeCursor(cursor) : null;
    let startIndex = 0;

    if (decoded) {
      const idx = filtered.findIndex(
        item => new Date(item.createdAt).getTime() < new Date(decoded.createdAt).getTime() ||
          (item.createdAt === decoded.createdAt && item.id < decoded.id)
      );
      startIndex = idx === -1 ? filtered.length : idx;
    }

    const slice = filtered.slice(startIndex, startIndex + limit + 1);
    const hasMore = slice.length > limit;
    const items = hasMore ? slice.slice(0, limit) : slice;
    const lastItem = items[items.length - 1];

    const nextCursor = hasMore && lastItem
      ? encodeCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
      : null;

    return { items, nextCursor, hasMore };
  }
}

export const store = new InMemoryDomainStore();
