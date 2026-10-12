require('dotenv').config();
require('ts-node').register({ transpileOnly: true });

const { runBillingUnitTests } = require('./billing.test.ts');

runBillingUnitTests()
  .then(() => {
    console.log('[Runner] All Milestone 9 tests completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Runner] Unit tests failed:', err);
    process.exit(1);
  });
