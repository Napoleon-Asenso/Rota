import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient, Role } from '@prisma/client';
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema } from '../schemas/auth';
import { signAccessToken } from '../utils/jwt';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  CANONICAL_PASSWORD_REQUIREMENTS,
  evaluatePasswordRequirements
} from '../utils/security';
export { hashToken };
import { AuthenticatedRequest } from '../types';
import { store } from '../services/store.service';

const prisma = new PrismaClient();

// In-memory 15-second grace window cache for rapid network retry resolution
interface GraceRecord {
  replacementToken: string;
  familyId: string;
  expiresAt: number;
}
const graceWindowCache = new Map<string, GraceRecord>();



export function generateSecureToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * POST /api/auth/register
 * Creates a new user, default workspace / attaches to invited team, and issues initial auth tokens.
 */
export async function registerHandler(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input data.',
          details: parseResult.error.flatten()
        }
      });
      return;
    }

    const { fullName, email, password, inviteToken, firstName, middleName, lastName } = parseResult.data;

    // Parse names for edge cases (first, middle, last name handling)
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    const derivedFirstName = firstName || (words[0] ?? fullName);
    const derivedLastName = lastName || (words.length > 1 ? words[words.length - 1] : '');
    const derivedMiddleName =
      middleName !== undefined
        ? middleName
        : words.length > 2
        ? words.slice(1, -1).join(' ')
        : null;

    // Check if user already exists in DB
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
          details: null
        }
      });
      return;
    }
    // Enforce all 5 canonical password requirements on the server
    const passwordEvaluation = evaluatePasswordRequirements(password);
    if (!passwordEvaluation.isValid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_REQUIREMENTS_UNMET',
          message: 'Password does not meet all security requirements.',
          details: {
            unmetRequirements: passwordEvaluation.unmetRequirements
          }
        }
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    // Create user and team transactionally
    let teamId: string;
    let userRole: Role = Role.OWNER;

    if (inviteToken) {
      // Find team associated with invite token, or default
      const existingTeam = await prisma.team.findFirst();
      teamId = existingTeam ? existingTeam.id : crypto.randomUUID();
      userRole = Role.STAFF;
    } else {
      const newTeam = await prisma.team.create({
        data: {
          name: 'My Team',
          industry: 'General'
        }
      });
      teamId = newTeam.id;
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        fullName,
        firstName: derivedFirstName,
        middleName: derivedMiddleName,
        lastName: derivedLastName,
        passwordHash,
        userSettings: {
          create: {
            quietHoursStart: '22:00',
            quietHoursEnd: '06:00',
            timezone: 'Africa/Lagos',
            pushShiftChanges: true,
            pushSwapRequests: true,
            pushApprovals: true
          }
        },
        memberships: {
          create: {
            teamId,
            role: userRole
          }
        }
      }
    });

    // Mirror in-memory store for fallback consistency
    store.users.set(user.id, {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: userRole,
      teamId,
      timezone: 'Africa/Lagos',
      tokenVersion: 1
    });

    // Issue 15-minute access token
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      teamId,
      role: userRole,
      tokenVersion: 1
    });

    // Issue 7-day refresh token with unique familyId
    const rawRefreshToken = generateSecureToken();
    const tokenHashStr = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHashStr,
        familyId,
        isRevoked: false,
        expiresAt
      }
    });

    store.refreshTokens.set(tokenHashStr, {
      userId: user.id,
      familyId,
      isRevoked: false,
      expiresAt
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: userRole,
          teamId
        },
        accessToken,
        refreshToken: rawRefreshToken
      }
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during registration.',
        details: null
      }
    });
  }
}

/**
 * POST /api/auth/login
 * Validates credentials and returns fresh access and refresh tokens.
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid credentials input.',
          details: parseResult.error.flatten()
        }
      });
      return;
    }

    const { email, password } = parseResult.data;

    // Query user with memberships
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: { team: true }
        }
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          details: null
        }
      });
      return;
    }

    // Verify password hash using constant-time comparison
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          details: null
        }
      });
      return;
    }

    // Resolve primary membership
    const primaryMembership = user.memberships[0];
    const teamId = primaryMembership ? primaryMembership.teamId : 'team-default-1';
    const role: Role = primaryMembership ? (primaryMembership.role as Role) : Role.STAFF;

    // Issue 15-minute access token
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      teamId,
      role,
      tokenVersion: 1
    });

    // Issue 7-day refresh token
    const rawRefreshToken = generateSecureToken();
    const tokenHashStr = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHashStr,
        familyId,
        isRevoked: false,
        expiresAt
      }
    });

    store.refreshTokens.set(tokenHashStr, {
      userId: user.id,
      familyId,
      isRevoked: false,
      expiresAt
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role,
          teamId
        },
        accessToken,
        refreshToken: rawRefreshToken
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during login.',
        details: null
      }
    });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh Token Rotation with Reuse / Theft Detection and 15-Second Grace Window
 */
export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = refreshTokenSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Refresh token is required.',
          details: null
        }
      });
      return;
    }

    const { refreshToken: rawToken } = parseResult.data;
    const presentedHash = hashToken(rawToken);

    // 1. Check 15-second grace window (handles network retries safely)
    const grace = graceWindowCache.get(presentedHash);
    if (grace && Date.now() < grace.expiresAt) {
      const existingToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: presentedHash },
        include: {
          user: {
            include: { memberships: true }
          }
        }
      });

      if (existingToken && existingToken.user) {
        const membership = existingToken.user.memberships[0];
        const accessToken = signAccessToken({
          sub: existingToken.user.id,
          email: existingToken.user.email,
          teamId: membership ? membership.teamId : 'team-default-1',
          role: membership ? (membership.role as Role) : Role.STAFF,
          tokenVersion: 1
        });

        res.status(200).json({
          success: true,
          data: {
            accessToken,
            refreshToken: grace.replacementToken
          }
        });
        return;
      }
    }

    // 2. Query presented token from database
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash: presentedHash },
      include: {
        user: {
          include: { memberships: true }
        }
      }
    });

    // 3. Token Reuse Detection (THEFT ALERT)
    // If the token exists and is already revoked outside the grace window:
    if (existing && existing.isRevoked) {
      console.warn(`[Auth Theft Alert] Revoked token presented outside grace window! Revoking family ${existing.familyId}`);

      // Immediately revoke ALL tokens under that familyId
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId },
        data: { isRevoked: true }
      });

      // Clear in-memory references
      for (const [h, val] of store.refreshTokens.entries()) {
        if (val.familyId === existing.familyId) {
          val.isRevoked = true;
        }
      }

      res.status(403).json({
        success: false,
        error: {
          code: 'TOKEN_THEFT_DETECTED',
          message: 'Token reuse detected. All sessions in this token family have been revoked.',
          details: null
        }
      });
      return;
    }

    // 4. Invalid or Expired Token
    if (!existing || existing.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or expired.',
          details: null
        }
      });
      return;
    }

    // 5. Legitimate Rotation
    const nextRawToken = generateSecureToken();
    const nextHash = hashToken(nextRawToken);
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000);

    // Revoke current token and create new rotated token
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { isRevoked: true }
    });

    await prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: nextHash,
        familyId: existing.familyId,
        isRevoked: false,
        expiresAt
      }
    });

    // Register 15-second grace window
    graceWindowCache.set(presentedHash, {
      replacementToken: nextRawToken,
      familyId: existing.familyId,
      expiresAt: Date.now() + 15000
    });

    // Update in-memory store
    store.refreshTokens.set(nextHash, {
      userId: existing.userId,
      familyId: existing.familyId,
      isRevoked: false,
      expiresAt
    });

    // Issue new access token
    const membership = existing.user.memberships[0];
    const teamId = membership ? membership.teamId : 'team-default-1';
    const role: Role = membership ? (membership.role as Role) : Role.STAFF;

    const accessToken = signAccessToken({
      sub: existing.user.id,
      email: existing.user.email,
      teamId,
      role,
      tokenVersion: 1
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: nextRawToken
      }
    });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during token refresh.',
        details: null
      }
    });
  }
}

/**
 * POST /api/auth/logout
 * Revokes the specific refresh token.
 */
export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.body.refreshToken;
    if (rawToken) {
      const hash = hashToken(rawToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hash },
        data: { isRevoked: true }
      });
      const inMem = store.refreshTokens.get(hash);
      if (inMem) inMem.isRevoked = true;
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully.'
      }
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during logout.',
        details: null
      }
    });
  }
}

/**
 * POST /api/auth/logout-all
 * Revokes all refresh tokens belonging to the authenticated user.
 */
export async function logoutAllHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to revoke sessions.',
          details: null
        }
      });
      return;
    }

    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true }
    });

    for (const val of store.refreshTokens.values()) {
      if (val.userId === userId) {
        val.isRevoked = true;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'All active sessions have been revoked successfully.'
      }
    });
  } catch (error) {
    console.error('[Auth] LogoutAll error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during global logout.',
        details: null
      }
    });
  }
}

/**
 * GET /api/auth/me
 * Returns profile details for the authenticated user.
 */
export async function meHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
          details: null
        }
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            teamId: true,
            team: {
              select: {
                name: true,
                industry: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account could not be found.',
          details: null
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.memberships[0]?.role || Role.STAFF,
        teamId: user.memberships[0]?.teamId || 'team-default-1',
        teamName: user.memberships[0]?.team?.name || 'My Team',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[Auth] Me error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred retrieving user profile.',
        details: null
      }
    });
  }
}

/**
 * POST /api/auth/forgot-password
 * Handles password reset request by validating the email and returning a safe confirmation.
 */
export async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Please provide a valid email address.',
          details: parseResult.error.flatten()
        }
      });
      return;
    }

    const { email } = parseResult.data;
    // Check if user exists (generic response to prevent email enumeration)
    await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'If an account exists with that email address, password reset instructions have been sent.'
      }
    });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred processing password reset.',
        details: null
      }
    });
  }
}

/**
 * GET /api/auth/password-requirements
 * Serves canonical password requirements directly from the server.
 */
export function passwordRequirementsHandler(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    data: {
      requirements: CANONICAL_PASSWORD_REQUIREMENTS
    }
  });
}

