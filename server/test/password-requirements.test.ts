import assert from 'assert';
import {
  evaluatePasswordRequirements,
  CANONICAL_PASSWORD_REQUIREMENTS,
  hashPassword,
  verifyPassword
} from '../src/utils/security';
import { registerSchema } from '../src/schemas/auth';

async function runPasswordTests(): Promise<void> {
  console.log('[Test] Running Password Requirements & Server-Side Security Tests...\n');

  // 1. Verify Canonical Password Requirements Metadata
  assert.strictEqual(
    CANONICAL_PASSWORD_REQUIREMENTS.length,
    5,
    'Server must define exactly 5 canonical password requirements'
  );

  const ruleIds = CANONICAL_PASSWORD_REQUIREMENTS.map((r) => r.id);
  assert.ok(ruleIds.includes('req-min-length'), 'Must include req-min-length');
  assert.ok(ruleIds.includes('req-uppercase'), 'Must include req-uppercase');
  assert.ok(ruleIds.includes('req-lowercase'), 'Must include req-lowercase');
  assert.ok(ruleIds.includes('req-number'), 'Must include req-number');
  assert.ok(ruleIds.includes('req-special'), 'Must include req-special');
  console.log('✓ Canonical password requirements metadata verified.');

  // 2. Test Server-Side Rule Evaluation
  // Short password
  const shortResult = evaluatePasswordRequirements('Ab1!');
  assert.strictEqual(shortResult.isValid, false);
  assert.ok(shortResult.unmetRequirements.some((r) => r.id === 'req-min-length'));

  // Missing uppercase
  const noUpper = evaluatePasswordRequirements('password123!');
  assert.strictEqual(noUpper.isValid, false);
  assert.ok(noUpper.unmetRequirements.some((r) => r.id === 'req-uppercase'));

  // Missing lowercase
  const noLower = evaluatePasswordRequirements('PASSWORD123!');
  assert.strictEqual(noLower.isValid, false);
  assert.ok(noLower.unmetRequirements.some((r) => r.id === 'req-lowercase'));

  // Missing number
  const noNumber = evaluatePasswordRequirements('PasswordSafe!');
  assert.strictEqual(noNumber.isValid, false);
  assert.ok(noNumber.unmetRequirements.some((r) => r.id === 'req-number'));

  // Missing special char
  const noSpecial = evaluatePasswordRequirements('Password123');
  assert.strictEqual(noSpecial.isValid, false);
  assert.ok(noSpecial.unmetRequirements.some((r) => r.id === 'req-special'));

  // Valid password meeting all 5 requirements
  const valid = evaluatePasswordRequirements('P@ssword123');
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.unmetRequirements.length, 0);
  console.log('✓ Server-side password evaluation passed for all 5 rules.');

  // 3. Test registerSchema Zod validation
  const validRegister = registerSchema.safeParse({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'P@ssword123'
  });
  assert.strictEqual(validRegister.success, true, 'registerSchema should pass valid password');

  const invalidRegister = registerSchema.safeParse({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'weak'
  });
  assert.strictEqual(invalidRegister.success, false, 'registerSchema should reject weak password');
  console.log('✓ registerSchema validation enforced.');

  // 4. Test Password Hashing and Constant-Time Verification
  const rawPassword = 'SecretP@ssword2026!';
  const hash = await hashPassword(rawPassword);
  assert.ok(hash && hash.length > 20, 'Hash must be generated');

  const match = await verifyPassword(rawPassword, hash);
  assert.strictEqual(match, true, 'Valid password verification must succeed');

  const wrongMatch = await verifyPassword('WrongPassword123!', hash);
  assert.strictEqual(wrongMatch, false, 'Invalid password verification must fail');
  console.log('✓ Hashing and constant-time verification passed.');

  console.log('\n[Success] All Password Requirements tests passed cleanly!\n');
}

runPasswordTests().catch((err) => {
  console.error('[Failed] Test failure:', err);
  process.exit(1);
});
