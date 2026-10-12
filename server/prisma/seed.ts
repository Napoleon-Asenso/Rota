import { PrismaClient, Role, ShiftStatus, SwapStatus, PlanTier, LedgerType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase(): Promise<void> {
  console.log('[Seeder] ==========================================');
  console.log('[Seeder] Starting Milestone 6 Database Seeding...');
  console.log('[Seeder] ==========================================');

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Clean existing records for idempotent seeding
  console.log('[Seeder] Cleaning existing test tenant data...');
  const existingTeam = await prisma.team.findFirst({
    where: { name: 'BiteRoute Cafe' }
  });

  if (existingTeam) {
    const teamId = existingTeam.id;
    await prisma.activity.deleteMany({ where: { teamId } });
    await prisma.shiftSwapRequest.deleteMany({
      where: { shift: { teamId } }
    });
    await prisma.shift.deleteMany({ where: { teamId } });
    await prisma.ledgerEntry.deleteMany({ where: { teamId } });
    await prisma.subscription.deleteMany({ where: { teamId } });
    await prisma.membership.deleteMany({ where: { teamId } });
    await prisma.team.delete({ where: { id: teamId } });
    console.log('[Seeder] Cleaned previous BiteRoute Cafe tenant records.');
  }

  // Also clean demo users if they exist
  const demoEmails = [
    'emeka@company.com',
    'sarah.johnson@company.com',
    'mike.brown@company.com',
    'lisa.green@company.com',
    'david.kim@company.com'
  ];

  for (const email of demoEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.userSettings.deleteMany({ where: { userId: user.id } });
      await prisma.deviceToken.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.membership.deleteMany({ where: { userId: user.id } });
      await prisma.shiftSwapRequest.deleteMany({
        where: {
          OR: [
            { requesterId: user.id },
            { targetUserId: user.id }
          ]
        }
      });
      await prisma.shift.deleteMany({ where: { userId: user.id } });
      await prisma.activity.deleteMany({ where: { actorId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }

  // 2. Create Users & UserSettings
  console.log('[Seeder] Creating users & notification preferences...');

  const emeka = await prisma.user.create({
    data: {
      email: 'emeka@company.com',
      fullName: 'Emeka Okafor',
      passwordHash: defaultPasswordHash,
      userSettings: {
        create: {
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          timezone: 'Africa/Lagos',
          pushShiftChanges: true,
          pushSwapRequests: true,
          pushApprovals: true
        }
      }
    }
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah.johnson@company.com',
      fullName: 'Sarah Johnson',
      passwordHash: defaultPasswordHash,
      userSettings: {
        create: {
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          timezone: 'Africa/Lagos',
          pushShiftChanges: true,
          pushSwapRequests: true,
          pushApprovals: true
        }
      }
    }
  });

  const mike = await prisma.user.create({
    data: {
      email: 'mike.brown@company.com',
      fullName: 'Mike Brown',
      passwordHash: defaultPasswordHash,
      userSettings: {
        create: {
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
          timezone: 'Africa/Lagos',
          pushShiftChanges: true,
          pushSwapRequests: true,
          pushApprovals: true
        }
      }
    }
  });

  const lisa = await prisma.user.create({
    data: {
      email: 'lisa.green@company.com',
      fullName: 'Lisa Green',
      passwordHash: defaultPasswordHash,
      userSettings: {
        create: {
          quietHoursStart: '21:30',
          quietHoursEnd: '06:30',
          timezone: 'Africa/Lagos',
          pushShiftChanges: true,
          pushSwapRequests: true,
          pushApprovals: true
        }
      }
    }
  });

  const david = await prisma.user.create({
    data: {
      email: 'david.kim@company.com',
      fullName: 'David Kim',
      passwordHash: defaultPasswordHash,
      userSettings: {
        create: {
          quietHoursStart: '00:00',
          quietHoursEnd: '08:00',
          timezone: 'Africa/Lagos',
          pushShiftChanges: true,
          pushSwapRequests: true,
          pushApprovals: true
        }
      }
    }
  });

  console.log(`[Seeder] Created 5 users: Emeka (Owner), Sarah (Manager), Mike, Lisa, David (Staff)`);

  // 3. Create Team: BiteRoute Cafe
  console.log('[Seeder] Creating team: BiteRoute Cafe...');
  const team = await prisma.team.create({
    data: {
      name: 'BiteRoute Cafe',
      industry: 'Hospitality & Food Service'
    }
  });

  // 4. Create Memberships
  console.log('[Seeder] Assigning team memberships with RBAC roles...');
  await prisma.membership.createMany({
    data: [
      { userId: emeka.id, teamId: team.id, role: Role.OWNER },
      { userId: sarah.id, teamId: team.id, role: Role.MANAGER },
      { userId: mike.id, teamId: team.id, role: Role.STAFF },
      { userId: lisa.id, teamId: team.id, role: Role.STAFF },
      { userId: david.id, teamId: team.id, role: Role.STAFF }
    ]
  });

  // 5. Create Subscription: Active Team Tier with 10 seats (5 used)
  console.log('[Seeder] Creating active Team tier subscription with 10 seats...');
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  await prisma.subscription.create({
    data: {
      teamId: team.id,
      tier: PlanTier.TEAM,
      seatCount: 10,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd
    }
  });

  // Create append-only Financial Ledger Entry
  await prisma.ledgerEntry.create({
    data: {
      teamId: team.id,
      type: LedgerType.CHARGE,
      amountCents: 12000, // $120.00 for 10 seats @ $12/seat
      balanceAfterCents: 12000,
      description: 'Initial monthly subscription charge - Team Tier (10 seats)',
      idempotencyKey: `init_sub_${team.id}_${periodStart.toISOString().slice(0, 7)}`
    }
  });

  // 6. Create 5 Upcoming Shifts (May 27, May 28, May 29)
  console.log('[Seeder] Seeding 5 upcoming shifts matching UI calendar...');
  const shift1 = await prisma.shift.create({
    data: {
      teamId: team.id,
      userId: sarah.id,
      roleTitle: 'Shift Supervisor',
      location: 'Main Floor',
      startTime: new Date('2026-05-27T09:00:00Z'),
      endTime: new Date('2026-05-27T17:00:00Z'),
      status: ShiftStatus.CONFIRMED
    }
  });

  const shift2 = await prisma.shift.create({
    data: {
      teamId: team.id,
      userId: mike.id,
      roleTitle: 'Line Cook',
      location: 'Kitchen',
      startTime: new Date('2026-05-27T12:00:00Z'),
      endTime: new Date('2026-05-27T20:00:00Z'),
      status: ShiftStatus.SCHEDULED
    }
  });

  const shift3 = await prisma.shift.create({
    data: {
      teamId: team.id,
      userId: lisa.id,
      roleTitle: 'Hostess',
      location: 'Front Desk',
      startTime: new Date('2026-05-28T09:00:00Z'),
      endTime: new Date('2026-05-28T17:00:00Z'),
      status: ShiftStatus.SCHEDULED
    }
  });

  const shift4 = await prisma.shift.create({
    data: {
      teamId: team.id,
      userId: david.id,
      roleTitle: 'Bartender',
      location: 'Bar Counter',
      startTime: new Date('2026-05-28T16:00:00Z'),
      endTime: new Date('2026-05-29T00:00:00Z'),
      status: ShiftStatus.SCHEDULED
    }
  });

  const shift5 = await prisma.shift.create({
    data: {
      teamId: team.id,
      userId: emeka.id,
      roleTitle: 'Lead Server',
      location: 'Dining Hall',
      startTime: new Date('2026-05-29T10:00:00Z'),
      endTime: new Date('2026-05-29T18:00:00Z'),
      status: ShiftStatus.SCHEDULED
    }
  });

  // Seed 1 active swap request for shift 5
  await prisma.shiftSwapRequest.create({
    data: {
      shiftId: shift5.id,
      requesterId: emeka.id,
      targetUserId: null, // Open for claim
      reason: 'Doctor appointment scheduled in the afternoon',
      status: SwapStatus.PENDING
    }
  });

  // 7. Create Initial Activity Records (Chronological order)
  console.log('[Seeder] Creating activity feed records with composite index keys...');
  const activitiesData = [
    {
      teamId: team.id,
      actorId: emeka.id,
      type: 'SUBSCRIPTION_UPGRADED',
      description: 'Emeka upgraded workspace to Team Tier (10 seats)',
      metadata: { tier: 'TEAM', seatCount: 10, pricePerSeatCents: 1200 },
      createdAt: new Date('2026-05-25T08:30:00Z')
    },
    {
      teamId: team.id,
      actorId: david.id,
      type: 'MEMBER_JOINED',
      description: 'David Kim joined BiteRoute Cafe as Staff',
      metadata: { role: 'STAFF', inviteMethod: 'EMAIL' },
      createdAt: new Date('2026-05-25T11:15:00Z')
    },
    {
      teamId: team.id,
      actorId: sarah.id,
      type: 'SHIFTS_PUBLISHED',
      description: 'Sarah published 5 upcoming shifts for May 27 - May 29',
      metadata: { shiftIds: [shift1.id, shift2.id, shift3.id, shift4.id, shift5.id], shiftCount: 5 },
      createdAt: new Date('2026-05-26T14:00:00Z')
    },
    {
      teamId: team.id,
      actorId: emeka.id,
      type: 'SWAP_REQUESTED',
      description: 'Emeka requested an open swap for Lead Server shift on Fri, May 29',
      metadata: { shiftId: shift5.id, reason: 'Doctor appointment scheduled in the afternoon' },
      createdAt: new Date('2026-05-26T16:20:00Z')
    }
  ];

  for (const act of activitiesData) {
    await prisma.activity.create({ data: act });
  }

  console.log('[Seeder] ==========================================');
  console.log('[Seeder] Database seed completed successfully! 🚀');
  console.log(`[Seeder] Team: BiteRoute Cafe (${team.id})`);
  console.log(`[Seeder] Demo Owner: Emeka Okafor (emeka@company.com)`);
  console.log(`[Seeder] Total Seats: 10 (5 consumed by active members)`);
  console.log(`[Seeder] Shifts Seeded: 5`);
  console.log(`[Seeder] Activities Seeded: 4`);
  console.log('[Seeder] ==========================================');
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('[Seeder] Error during seed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
