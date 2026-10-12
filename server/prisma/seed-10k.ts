import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ACTIVITY_TYPES = [
  'SHIFT_PUBLISHED',
  'SWAP_REQUEST',
  'SWAP_APPROVED',
  'MEMBER_JOINED',
  'SUBSCRIPTION_UPGRADED'
];

export async function seed10kActivities(): Promise<void> {
  console.log('===============================================================');
  console.log('   ROTA MILESTONE 8: 10,000-RECORD HIGH-VOLUME ACTIVITY SEED   ');
  console.log('===============================================================');

  // 1. Locate Demo Team & Actor
  let team = await prisma.team.findFirst({
    where: { name: 'BiteRoute Cafe' }
  });

  if (!team) {
    console.log('[Seed-10k] Creating BiteRoute Cafe team...');
    team = await prisma.team.create({
      data: {
        name: 'BiteRoute Cafe',
        industry: 'Hospitality & Food Service'
      }
    });
  }

  let user = await prisma.user.findFirst({
    where: { email: 'emeka@company.com' }
  });

  if (!user) {
    console.log('[Seed-10k] Creating demo actor user...');
    user = await prisma.user.create({
      data: {
        email: 'emeka@company.com',
        fullName: 'Emeka Okafor',
        passwordHash: '$2a$10$xyzFakeHashForTestingOnly1234567890'
      }
    });
  }

  console.log(`[Seed-10k] Target Tenant: ${team.name} (ID: ${team.id})`);
  console.log(`[Seed-10k] Target Actor:  ${user.fullName} (ID: ${user.id})`);

  // 2. Clear existing activity records for clean benchmark
  const existingCount = await prisma.activity.count({
    where: { teamId: team.id }
  });
  console.log(`[Seed-10k] Existing activity records for tenant: ${existingCount}`);

  if (existingCount < 10000) {
    const recordsToInsert = 10000 - existingCount;
    console.log(`[Seed-10k] Inserting ${recordsToInsert} records in chunks of 2,000...`);

    const chunkSize = 2000;
    const nowMs = Date.now();
    let inserted = 0;

    for (let chunkStart = 0; chunkStart < recordsToInsert; chunkStart += chunkSize) {
      const currentBatchSize = Math.min(chunkSize, recordsToInsert - chunkStart);
      const batchData = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const itemIndex = existingCount + chunkStart + i;
        const type = ACTIVITY_TYPES[itemIndex % ACTIVITY_TYPES.length];
        // Decreasing timestamp by 30 seconds for each record
        const recordTime = new Date(nowMs - itemIndex * 30000);

        batchData.push({
          id: crypto.randomUUID(),
          teamId: team.id,
          actorId: user.id,
          type,
          description: `Activity #${itemIndex + 1}: ${type.toLowerCase().replace(/_/g, ' ')}`,
          metadata: {
            index: itemIndex,
            batch: Math.floor(itemIndex / chunkSize),
            source: 'seed-10k-benchmark'
          },
          createdAt: recordTime
        });
      }

      await prisma.activity.createMany({
        data: batchData
      });

      inserted += currentBatchSize;
      console.log(`[Seed-10k] Batch progress: ${inserted}/${recordsToInsert} inserted (${Math.round((inserted / recordsToInsert) * 100)}%)`);
    }
  }

  const totalCount = await prisma.activity.count({
    where: { teamId: team.id }
  });
  console.log(`\n[Seed-10k] Total activities in DB for tenant ${team.id}: ${totalCount} records.`);

  // 3. Benchmark Composite Cursor Query with EXPLAIN ANALYZE
  console.log('\n===============================================================');
  console.log('   RUNNING EXPLAIN ANALYZE PERFORMANCE BENCHMARKS (< 50ms)    ');
  console.log('===============================================================');

  // Grab a middle record to simulate an actual cursor mid-page seek
  const midItem = await prisma.activity.findFirst({
    where: { teamId: team.id },
    skip: 4500,
    take: 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });

  const cursorCreatedAt = midItem ? midItem.createdAt.toISOString() : new Date().toISOString();
  const cursorId = midItem ? midItem.id : crypto.randomUUID();

  console.log(`[Benchmark] Simulated Mid-Stream Cursor:`);
  console.log(`            createdAt: ${cursorCreatedAt}`);
  console.log(`            id:        ${cursorId}`);

  // --- BENCHMARK A: BEFORE / WITHOUT COMPOSITE INDEX (FORCED SEQ SCAN) ---
  console.log('\n---------------------------------------------------------------');
  console.log('1. BEFORE COMPOSITE INDEX (Forced Sequential Table Scan):');
  console.log('---------------------------------------------------------------');

  // Turn off index scan in session
  await prisma.$executeRawUnsafe(`SET enable_indexscan = off;`);
  await prisma.$executeRawUnsafe(`SET enable_bitmapscan = off;`);

  const tStartSeq = performance.now();
  const seqPlanResult: any = await prisma.$queryRawUnsafe(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, "teamId", "actorId", type, description, "createdAt"
    FROM activities
    WHERE "teamId" = '${team.id}'
      AND ("createdAt" < '${cursorCreatedAt}'::timestamptz OR ("createdAt" = '${cursorCreatedAt}'::timestamptz AND id < '${cursorId}'))
    ORDER BY "createdAt" DESC, id DESC
    LIMIT 21;
  `);
  const tEndSeq = performance.now();
  const seqWallTime = (tEndSeq - tStartSeq).toFixed(2);

  const seqPlanLines = Array.isArray(seqPlanResult)
    ? seqPlanResult.map((r: any) => Object.values(r)[0]).join('\n')
    : JSON.stringify(seqPlanResult, null, 2);

  console.log(seqPlanLines);
  console.log(`[Result] Sequential Scan Wall Time: ${seqWallTime} ms`);

  // --- BENCHMARK B: AFTER / WITH COMPOSITE INDEX (INDEX SCAN) ---
  console.log('\n---------------------------------------------------------------');
  console.log('2. AFTER COMPOSITE INDEX (O(1) Composite Index Scan):');
  console.log('---------------------------------------------------------------');

  // Re-enable index scans
  await prisma.$executeRawUnsafe(`SET enable_indexscan = on;`);
  await prisma.$executeRawUnsafe(`SET enable_bitmapscan = on;`);

  const tStartIndex = performance.now();
  const indexPlanResult: any = await prisma.$queryRawUnsafe(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, "teamId", "actorId", type, description, "createdAt"
    FROM activities
    WHERE "teamId" = '${team.id}'
      AND ("createdAt" < '${cursorCreatedAt}'::timestamptz OR ("createdAt" = '${cursorCreatedAt}'::timestamptz AND id < '${cursorId}'))
    ORDER BY "createdAt" DESC, id DESC
    LIMIT 21;
  `);
  const tEndIndex = performance.now();
  const indexWallTime = (tEndIndex - tStartIndex).toFixed(2);

  const indexPlanLines = Array.isArray(indexPlanResult)
    ? indexPlanResult.map((r: any) => Object.values(r)[0]).join('\n')
    : JSON.stringify(indexPlanResult, null, 2);

  console.log(indexPlanLines);
  console.log(`[Result] Composite Index Scan Wall Time: ${indexWallTime} ms`);

  console.log('\n===============================================================');
  console.log('   BENCHMARK SUMMARY');
  console.log(`   - Records Queried:      ${totalCount}`);
  console.log(`   - Seq Scan Time:        ${seqWallTime} ms`);
  console.log(`   - Composite Index Time: ${indexWallTime} ms (Target: < 50ms)`);
  console.log('===============================================================\n');
}

if (require.main === module) {
  seed10kActivities()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed-10k] Fatal Error:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
