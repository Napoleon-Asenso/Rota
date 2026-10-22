import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * ============================================================================
 * Security & Cryptographic Utilities
 * ============================================================================
 * 
 * Compliant with PRD.md, AGENTS.md, and OWASP Top 10:
 * - Explicit salt generation (16-byte random salt for Argon2id, 12 rounds for bcrypt)
 * - Canonical 5-rule password requirements evaluated server-side
 * - Constant-time verification preventing timing attacks
 * - SHA-256 token hashing for secure refresh token database storage
 * - Zero plaintext password logging
 */

// OWASP Recommended Cost Parameters for Argon2id
export const ARGON2_CONFIG = {
  type: 2, // argon2id
  memoryCost: 65536, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 1, // 1 thread
  saltLength: 16 // 16 bytes cryptographically secure random salt
} as const;

export const BCRYPT_SALT_ROUNDS = 12;

// Check dynamically if argon2 native module is available
let argon2Module: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  argon2Module = require('argon2');
} catch {
  argon2Module = null;
}

/**
 * Hashes a plaintext password using Argon2id (if available) or bcryptjs fallback.
 * Strictly avoids logging plaintext passwords.
 * Enforces explicit salt generation for guaranteed cryptographic entropy.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }

  if (argon2Module) {
    try {
      // Explicit 16-byte cryptographically secure random salt
      const salt = crypto.randomBytes(ARGON2_CONFIG.saltLength);
      return await argon2Module.hash(password, {
        type: argon2Module.argon2id ?? 2,
        memoryCost: ARGON2_CONFIG.memoryCost,
        timeCost: ARGON2_CONFIG.timeCost,
        parallelism: ARGON2_CONFIG.parallelism,
        salt
      });
    } catch {
      // Fallback to bcrypt if argon2 encounters any runtime error
    }
  }

  // Explicit bcrypt salt generation with 12 rounds
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

/**
 * Constant-time comparison between two string buffers.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a password against a hash using constant-time comparison.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    // If hash starts with $argon2, verify via argon2
    if (hash.startsWith('$argon2') && argon2Module) {
      return await argon2Module.verify(hash, password);
    }

    // Bcrypt comparison ($2a$, $2b$, $2y$)
    if (hash.startsWith('$2')) {
      const match = await bcrypt.compare(password, hash);
      return match;
    }

    // Fallback constant-time hash comparison if a hex-digest hash format was provided
    if (hash.length === 64) {
      const computed = hashToken(password);
      return timingSafeStringEqual(computed, hash);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Hashes a raw token (e.g. refresh token, reset token) using SHA-256 for secure database storage.
 */
export function hashToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a valid string.');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Canonical Server-Side Password Requirements
 */
export interface PasswordRequirement {
  id: string;
  label: string;
  rule: 'MIN_LENGTH' | 'UPPERCASE' | 'LOWERCASE' | 'NUMBER' | 'SPECIAL_CHAR';
  minLength?: number;
  regex?: string;
}

export const CANONICAL_PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'req-min-length', label: 'Min of 8 characters', rule: 'MIN_LENGTH', minLength: 8 },
  { id: 'req-uppercase', label: '1 uppercase', rule: 'UPPERCASE', regex: '[A-Z]' },
  { id: 'req-lowercase', label: '1 lowercase', rule: 'LOWERCASE', regex: '[a-z]' },
  { id: 'req-number', label: '1 number', rule: 'NUMBER', regex: '[0-9]' },
  { id: 'req-special', label: '1 special character', rule: 'SPECIAL_CHAR', regex: '[^A-Za-z0-9]' }
];

export interface PasswordEvaluationResult {
  isValid: boolean;
  requirements: Array<{
    id: string;
    label: string;
    met: boolean;
  }>;
  unmetRequirements: Array<{
    id: string;
    label: string;
  }>;
}

/**
 * Server-side evaluation of all five canonical password requirements.
 */
export function evaluatePasswordRequirements(password: string): PasswordEvaluationResult {
  const isMinLength = typeof password === 'string' && password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password || '');
  const hasLowercase = /[a-z]/.test(password || '');
  const hasNumber = /[0-9]/.test(password || '');
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password || '');

  const requirements = [
    { id: 'req-min-length', label: 'Min of 8 characters', met: isMinLength },
    { id: 'req-uppercase', label: '1 uppercase', met: hasUppercase },
    { id: 'req-lowercase', label: '1 lowercase', met: hasLowercase },
    { id: 'req-number', label: '1 number', met: hasNumber },
    { id: 'req-special', label: '1 special character', met: hasSpecialChar }
  ];

  const unmetRequirements = requirements
    .filter((req) => !req.met)
    .map((req) => ({ id: req.id, label: req.label }));

  return {
    isValid: unmetRequirements.length === 0,
    requirements,
    unmetRequirements
  };
}

/**
 * Sanitizes any data structure to ensure passwords are NEVER logged.
 */
export function sanitizeForLogging<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging) as unknown as T;
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (/password|pass|pwd|secret|token/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeForLogging(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized as T;
}
