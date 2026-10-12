require('dotenv').config();
require('ts-node').register({ transpileOnly: true });
const { seed10kActivities } = require('./prisma/seed-10k.ts');

seed10kActivities()
  .then(() => {
    console.log('BENCHMARK_COMPLETED');
    process.exit(0);
  })
  .catch((e) => {
    console.error('SEED_FAILED:', e);
    process.exit(1);
  });
