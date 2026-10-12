require('dotenv').config();
require('ts-node').register({ transpileOnly: true });

const { runBillingUnitTests } = require('./billing.test.ts');
const { runNotificationUnitTests } = require('./notifications.test.ts');

async function main() {
  await runBillingUnitTests();
  await runNotificationUnitTests();
  console.log('[Runner] All Milestone 9 and Milestone 10 tests passed with 100% success.');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Runner] Unit tests failed:', err);
    process.exit(1);
  });
