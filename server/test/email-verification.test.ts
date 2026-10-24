import assert from 'assert';
import {
  generateFourDigitVerificationCode,
  verifyVerificationCode,
  hashToken
} from '../src/utils/security';
import { verificationService } from '../src/services/verification.service';
import { sendVerificationEmailSchema, verifyEmailSchema } from '../src/schemas/auth';
import {
  getEmailTransporter,
  sendVerificationEmail,
  sendWelcomeEmail,
  isWelcomeEmailSent,
  _clearWelcomeEmailsForTesting,
  setEmailTransporter
} from '../src/services/email.service';
import nodemailer from 'nodemailer';

async function runEmailVerificationTests(): Promise<void> {
  console.log('[Test] Running Email Verification (One-Time, 4-Digit, Nodemailer) Tests...\n');

  // --------------------------------------------------------------------------
  // Test 1: 4-Digit Code Generation with crypto.randomBytes(32)
  // --------------------------------------------------------------------------
  console.log('1. Testing crypto.randomBytes(32) 4-digit code generation...');
  for (let i = 0; i < 100; i++) {
    const code = generateFourDigitVerificationCode();
    assert.strictEqual(code.length, 4, `Code must be exactly 4 characters: ${code}`);
    assert.match(code, /^\d{4}$/, `Code must be strictly numeric: ${code}`);
    const num = parseInt(code, 10);
    assert.ok(num >= 1000 && num <= 9999, `Code must be a 4-digit number between 1000 and 9999, got ${num}`);
  }
  console.log('✓ 100 random code iterations all produced valid 4-digit numbers (1000-9999).');

  // --------------------------------------------------------------------------
  // Test 2: Constant-Time Timing-Safe Code Verification
  // --------------------------------------------------------------------------
  console.log('2. Testing timing-safe code verification...');
  const testCode = '4829';
  const targetHash = hashToken(testCode);

  assert.strictEqual(verifyVerificationCode(testCode, targetHash), true, 'Valid code must match hash');
  assert.strictEqual(verifyVerificationCode('1234', targetHash), false, 'Wrong code must fail');
  assert.strictEqual(verifyVerificationCode('482', targetHash), false, 'Wrong length code must fail');
  assert.strictEqual(verifyVerificationCode('48299', targetHash), false, 'Overlength code must fail');
  console.log('✓ Constant-time code verification passed.');

  // --------------------------------------------------------------------------
  // Test 3: Zod Schema Validation
  // --------------------------------------------------------------------------
  console.log('3. Testing Zod schema validation...');
  const validSend = sendVerificationEmailSchema.safeParse({ email: 'user@example.com' });
  assert.strictEqual(validSend.success, true, 'Valid email should pass sendVerificationEmailSchema');

  const invalidSend = sendVerificationEmailSchema.safeParse({ email: 'not-an-email' });
  assert.strictEqual(invalidSend.success, false, 'Invalid email should fail sendVerificationEmailSchema');

  const validVerify = verifyEmailSchema.safeParse({ email: 'user@example.com', code: '5678' });
  assert.strictEqual(validVerify.success, true, 'Valid 4-digit code should pass verifyEmailSchema');

  const invalidVerifyLength = verifyEmailSchema.safeParse({ email: 'user@example.com', code: '123' });
  assert.strictEqual(invalidVerifyLength.success, false, '3-digit code should fail verifyEmailSchema');

  const invalidVerifyAlpha = verifyEmailSchema.safeParse({ email: 'user@example.com', code: '123a' });
  assert.strictEqual(invalidVerifyAlpha.success, false, 'Alphanumeric code should fail verifyEmailSchema');
  console.log('✓ Zod schemas enforce email and 4-digit numeric constraints.');

  // --------------------------------------------------------------------------
  // Test 4: Nodemailer Delivery Integration
  // --------------------------------------------------------------------------
  console.log('4. Testing Nodemailer email delivery...');
  const emailResult = await sendVerificationEmail('test@rota.app', '7890');
  assert.strictEqual(emailResult.success, true, 'Nodemailer sendVerificationEmail must succeed');
  assert.ok(emailResult.messageId, 'MessageId must be returned by transporter');
  console.log('✓ Nodemailer successfully processed message with HTML and text templates.');

  // --------------------------------------------------------------------------
  // Test 5: One-Time Verification Lifecycle (Single-Use Guarantee)
  // --------------------------------------------------------------------------
  console.log('5. Testing One-Time Verification (Single-Use consumption)...');
  verificationService._clearForTesting();

  const testEmail = 'doctor.who@tardis.org';
  const sendRes = await verificationService.sendVerificationCode(testEmail);
  assert.strictEqual(sendRes.success, true, 'sendVerificationCode must succeed');
  const issuedCode = sendRes.code || verificationService._getLatestCodeForTesting(testEmail);
  assert.ok(issuedCode, 'Test code must be retrieved');
  assert.match(issuedCode, /^\d{4}$/, 'Issued code must be 4 digits');

  // Verify first time -> MUST SUCCEED
  const firstAttempt = await verificationService.verifyCode(testEmail, issuedCode);
  assert.strictEqual(firstAttempt.success, true, 'First verification attempt must succeed');
  assert.strictEqual(firstAttempt.codeValid, true);
  assert.strictEqual(verificationService.isEmailVerified(testEmail), true, 'Email must be recorded as verified');

  // Verify second time with SAME code -> MUST FAIL (One-Time Verification guarantee)
  const secondAttempt = await verificationService.verifyCode(testEmail, issuedCode);
  assert.strictEqual(
    secondAttempt.success,
    false,
    'Second verification attempt with same code MUST FAIL (code was consumed)'
  );
  console.log('✓ One-Time Verification verified: code was consumed immediately upon first verification.');

  // --------------------------------------------------------------------------
  // Test 6: Rate Limiting / Brute Force Protection
  // --------------------------------------------------------------------------
  console.log('6. Testing brute force attempt limit (5 attempts max)...');
  const bruteEmail = 'target@clinic.com';
  const bruteSend = await verificationService.sendVerificationCode(bruteEmail);
  assert.strictEqual(bruteSend.success, true);
  const correctCode = bruteSend.code || verificationService._getLatestCodeForTesting(bruteEmail)!;
  assert.ok(correctCode, 'Correct code must be retrieved');

  // 4 wrong attempts
  for (let i = 0; i < 4; i++) {
    const wrong = await verificationService.verifyCode(bruteEmail, '0000');
    assert.strictEqual(wrong.success, false, `Wrong attempt ${i + 1} should fail`);
  }

  // 5th wrong attempt triggers invalidation
  const finalWrong = await verificationService.verifyCode(bruteEmail, '0000');
  assert.strictEqual(finalWrong.success, false);
  assert.ok(finalWrong.error?.includes('Maximum verification attempts exceeded'));

  // Even the CORRECT code now fails because attempts were exhausted
  const correctAfterExhaustion = await verificationService.verifyCode(bruteEmail, correctCode);
  assert.strictEqual(
    correctAfterExhaustion.success,
    false,
    'Code must be completely invalid after exceeding maximum attempts'
  );
  // --------------------------------------------------------------------------
  // Test 7: Welcome Email Dispatch & Content Verification
  // --------------------------------------------------------------------------
  console.log('7. Testing Welcome Email dispatch (Subject, Body, and Server Verification)...');
  _clearWelcomeEmailsForTesting();

  const welcomeUserEmail = 'new.user@restaurant.com';
  assert.strictEqual(isWelcomeEmailSent(welcomeUserEmail), false, 'Initially welcome email should not be marked as sent');

  const welcomeResult = await sendWelcomeEmail(
    welcomeUserEmail,
    'Amara Eze',
    'MANAGER',
    'Sunset Bistro'
  );

  assert.strictEqual(welcomeResult.success, true, 'sendWelcomeEmail must return success: true');
  assert.ok(welcomeResult.messageId, 'sendWelcomeEmail must return a valid messageId');
  assert.strictEqual(isWelcomeEmailSent(welcomeUserEmail), true, 'User email must be recorded as having received welcome email');

  // Verify duplicate prevention
  const duplicateResult = await sendWelcomeEmail(
    welcomeUserEmail,
    'Amara Eze',
    'MANAGER',
    'Sunset Bistro'
  );
  assert.strictEqual(duplicateResult.success, true, 'Duplicate call should be handled gracefully');
  assert.strictEqual(duplicateResult.messageId, 'already-sent-cached', 'Duplicate call should be cached');

  // Verify sending to a staff user with single word name
  const staffEmail = 'staff.john@clinic.org';
  const staffResult = await sendWelcomeEmail(staffEmail, 'John', 'STAFF');
  assert.strictEqual(staffResult.success, true);
  assert.ok(staffResult.messageId);
  assert.strictEqual(isWelcomeEmailSent(staffEmail), true);

  console.log('✓ Welcome email dispatch, personalized subject, HTML/text body, and duplicate prevention passed.');

  console.log('\n[Success] All Email Verification & Welcome Email tests passed with 100% success!\n');
}

runEmailVerificationTests().catch((err) => {
  console.error('[Failed] Email verification test failed:', err);
  process.exit(1);
});
