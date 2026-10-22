import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types';
import { store, MemberRecord } from '../services/store.service';
import { InviteMemberSchema } from '../schemas/teams';

export function listMembersHandler(req: AuthenticatedRequest, res: Response): void {
  const teamId = (req.params.teamId as string) || req.tenant?.teamId || 'team-rota-main';
  const members = Array.from(store.members.values()).filter((m) => m.teamId === teamId);

  res.status(200).json({
    success: true,
    data: {
      totalCount: members.length,
      rolesCount: 3,
      members
    }
  });
}

export function inviteMemberHandler(req: AuthenticatedRequest, res: Response): void {
  const data = InviteMemberSchema.parse(req.body);
  const teamId = (req.params.teamId as string) || req.tenant?.teamId || 'team-rota-main';

  // Server-Side Business Invariant: Seat Limit Validation (HTTP 402)
  const sub = store.subscriptions.get(teamId);
  if (sub && sub.consumedSeats >= sub.totalSeats) {
    res.status(402).json({
      success: false,
      error: {
        code: 'SEAT_LIMIT_EXCEEDED',
        message: 'Team seat limit reached. Please purchase additional subscription seats before inviting new members.',
        details: {
          consumedSeats: sub.consumedSeats,
          totalSeats: sub.totalSeats
        }
      }
    });
    return;
  }

  const newMember: MemberRecord = {
    id: crypto.randomUUID(),
    teamId,
    userId: crypto.randomUUID(),
    fullName: data.email.split('@')[0],
    email: data.email,
    role: data.role,
    status: 'Pending'
  };

  store.members.set(newMember.id, newMember);

  // Increment consumed seats atomically
  if (sub) {
    sub.consumedSeats = sub.consumedSeats + 1;
  }

  res.status(201).json({
    success: true,
    data: newMember
  });
}
