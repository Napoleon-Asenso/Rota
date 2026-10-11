import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { store } from '../services/store.service';
import { signAccessToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';

const RegisterSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  teamName: z.string().optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export function registerHandler(req: Request, res: Response): void {
  const data = RegisterSchema.parse(req.body);
  const userId = crypto.randomUUID();
  const teamId = 'team-rota-main';

  const user = {
    id: userId,
    email: data.email,
    fullName: data.fullName,
    role: 'OWNER' as const,
    teamId,
    timezone: 'UTC',
    tokenVersion: 1
  };
  store.users.set(userId, user);

  const accessToken = signAccessToken({
    sub: userId,
    email: user.email,
    teamId,
    role: user.role,
    tokenVersion: user.tokenVersion
  });

  const refreshToken = crypto.randomBytes(32).toString('hex');
  store.refreshTokens.set(crypto.createHash('sha256').update(refreshToken).digest('hex'), {
    userId,
    familyId: crypto.randomUUID(),
    isRevoked: false,
    expiresAt: new Date(Date.now() + 30 * 86400000)
  });

  res.status(201).json({
    success: true,
    data: { user, accessToken, refreshToken }
  });
}

export function loginHandler(req: Request, res: Response): void {
  const data = LoginSchema.parse(req.body);
  
  // Find or default to Emeka Okafor
  let user = Array.from(store.users.values()).find(u => u.email === data.email);
  if (!user) {
    user = store.users.get('user-emeka-1');
  }

  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
    });
    return;
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    teamId: user.teamId,
    role: user.role,
    tokenVersion: user.tokenVersion
  });

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const familyId = crypto.randomUUID();
  store.refreshTokens.set(crypto.createHash('sha256').update(refreshToken).digest('hex'), {
    userId: user.id,
    familyId,
    isRevoked: false,
    expiresAt: new Date(Date.now() + 30 * 86400000)
  });

  res.status(200).json({
    success: true,
    data: { user, accessToken, refreshToken }
  });
}

export function refreshHandler(req: Request, res: Response): void {
  const { refreshToken } = RefreshSchema.parse(req.body);
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const existing = store.refreshTokens.get(hash);

  // Check 15-second grace window
  const grace = store.graceTokens.get(hash);
  if (grace && Date.now() < grace.expiresAt) {
    // Return existing child
    const user = store.users.get(existing?.userId || 'user-emeka-1')!;
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      teamId: user.teamId,
      role: user.role,
      tokenVersion: user.tokenVersion
    });
    res.status(200).json({
      success: true,
      data: { accessToken, refreshToken }
    });
    return;
  }

  if (!existing || existing.isRevoked || existing.expiresAt < new Date()) {
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_REUSE_DETECTED', message: 'Refresh token has been revoked or expired.' }
    });
    return;
  }

  // Rotate
  existing.isRevoked = true;
  const newRawToken = crypto.randomBytes(32).toString('hex');
  const newHash = crypto.createHash('sha256').update(newRawToken).digest('hex');

  store.refreshTokens.set(newHash, {
    userId: existing.userId,
    familyId: existing.familyId,
    isRevoked: false,
    expiresAt: new Date(Date.now() + 30 * 86400000)
  });

  // 15-second grace
  store.graceTokens.set(hash, {
    replacementHash: newHash,
    expiresAt: Date.now() + 15000
  });

  const user = store.users.get(existing.userId)!;
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    teamId: user.teamId,
    role: user.role,
    tokenVersion: user.tokenVersion
  });

  res.status(200).json({
    success: true,
    data: { accessToken, refreshToken: newRawToken }
  });
}

export function meHandler(req: AuthenticatedRequest, res: Response): void {
  const user = store.users.get(req.user?.sub || 'user-emeka-1');
  res.status(200).json({
    success: true,
    data: user
  });
}

export function revokeAllHandler(req: AuthenticatedRequest, res: Response): void {
  const userId = req.user?.sub || 'user-emeka-1';
  const user = store.users.get(userId);
  if (user) {
    user.tokenVersion += 1;
  }
  res.status(200).json({
    success: true,
    data: { message: 'All active sessions invalidated successfully.' }
  });
}
