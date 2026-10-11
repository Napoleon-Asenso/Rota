import { Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { store, MemberRecord } from '../services/store.service';

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).default('STAFF')
});

export function listMembersHandler(req: AuthenticatedRequest, res: Response): void {
  const teamId = (req.params.teamId as string) || req.tenant?.teamId || 'team-rota-main';
  const members = Array.from(store.members.values()).filter(m => m.teamId === teamId);

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

  // Update consumed seats
  const sub = store.subscriptions.get(teamId);
  if (sub) {
    sub.consumedSeats = Math.min(sub.totalSeats, sub.consumedSeats + 1);
  }

  res.status(201).json({
    success: true,
    data: newMember
  });
}
