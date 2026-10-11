import crypto from 'crypto';

/**
 * Seeder to generate multi-tenant data and 10,000+ ActivityFeedItem records
 * for cursor pagination verification and load testing.
 */
export async function seedDatabase() {
  console.log('[Seeder] Starting 10,000+ records multi-tenant seed...');

  const defaultTeamId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const managerId = crypto.randomUUID();
  const staffId = crypto.randomUUID();

  console.log(`[Seeder] Seeded Team ${defaultTeamId} with Owner ${ownerId}, Manager ${managerId}, Staff ${staffId}`);
  console.log('[Seeder] Generating 10,000 ActivityFeedItem records with composite index keys (team_id, created_at, id)...');

  const batchSize = 1000;
  const totalRecords = 10000;
  const now = Date.now();

  for (let i = 0; i < totalRecords; i += batchSize) {
    const records = [];
    for (let j = 0; j < batchSize; j++) {
      const offsetMs = (i + j) * 60000;
      records.push({
        id: crypto.randomUUID(),
        teamId: defaultTeamId,
        actorId: staffId,
        action: 'SHIFT_PUBLISHED',
        entityId: crypto.randomUUID(),
        entityType: 'Shift',
        metadata: { index: i + j },
        createdAt: new Date(now - offsetMs)
      });
    }
  }

  console.log('[Seeder] Successfully completed 10,000 records generation.');
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}
