---
name: manage-auth-and-secure-store
description: End-to-end runbook for multi-tenant JWT auth, refresh token rotation with a 15-second grace window, server-side RBAC, and expo-secure-store integration.
version: 1.0.0
---

# Manage Auth & SecureStore Skill

## 1. Context & Purpose
This skill governs authentication lifecycle, token minting, rotation race handling, session invalidation, and secure mobile credential persistence. It prevents token replay attacks, ensures seamless mobile reconnection during network hiccups, and eliminates client-side privilege escalation.

---

## 2. Invariants & Security Guardrails

- **Short-Lived Access Tokens**: Signed with HMAC-SHA256 (`JWT_SECRET`). Lifespan: Strictly 15 minutes.
- **Hashed Refresh Tokens**: 64-byte cryptographically secure random string, stored hashed via SHA-256 with `familyId` and 30-day absolute expiration.
- **15-Second Grace Window**:
  - When $R_1$ rotates to $R_2$, store in Redis: `SET token:grace:{hash(R1)} {hash(R2)} EX 15`.
  - If $R_1$ is re-submitted within 15 seconds (network retry), return $R_2$ without minting a third token or invalidating the family.
- **Token Family Revocation on Reuse**:
  - If a revoked token is submitted *outside* the 15-second window, mark all tokens in the `familyId` as revoked (`isRevoked: true`), purge Redis user sessions, and return HTTP `401 Unauthorized` (`TOKEN_REUSE_DETECTED`).
- **Mobile Hardware Storage**:
  - Access and refresh tokens must ONLY be stored using `expo-secure-store`.
  - Never store auth tokens in unencrypted `@react-native-async-storage/async-storage` or memory caches.
- **Server-Side RBAC**:
  - Client-supplied `role` is NEVER trusted. Role is verified via `tenantContextMiddleware` against PostgreSQL/Redis.

---

## 3. Server-Side Token Issuance & Grace Window Rotation

In `server/src/services/auth.service.ts`:

```typescript
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { Redis } from 'ioredis';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function issueAccessToken(user: User, teamId: string, role: string): string {
  return jwt.sign(
    {
      sub: user.id,
      teamId,
      role,
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY, jwtid: crypto.randomUUID() }
  );
}

export async function rotateRefreshToken(
  prisma: PrismaClient,
  redis: Redis,
  presentedRawToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const presentedHash = hashToken(presentedRawToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: presentedHash },
    include: { user: true }
  });

  // Handle Revoked or Missing Token
  if (!existing || existing.isRevoked || existing.expiresAt < new Date()) {
    // 1. Check if within 15-second grace window
    const activeChildHash = await redis.get(`token:grace:${presentedHash}`);
    if (activeChildHash && existing) {
      // Find team membership to resolve role
      const membership = await prisma.teamMembership.findFirst({
        where: { userId: existing.userId, isActive: true }
      });
      const accessToken = issueAccessToken(
        existing.user,
        membership?.teamId ?? '',
        membership?.role ?? 'STAFF'
      );
      // Return existing active replacement
      return { accessToken, refreshToken: presentedRawToken };
    }

    // 2. Token reuse attack detected outside grace window: Revoke family!
    if (existing) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId },
        data: { isRevoked: true }
      });
      await redis.del(`user:${existing.userId}:sessions`);
    }

    const error: any = new Error('TOKEN_REUSE_DETECTED');
    error.statusCode = 401;
    error.code = 'TOKEN_REUSE_DETECTED';
    throw error;
  }

  // Legitimate rotation: Mark old revoked and issue new child
  const nextRawToken = generateSecureToken();
  const nextHash = hashToken(nextRawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { isRevoked: true }
    }),
    prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: nextHash,
        familyId: existing.familyId,
        expiresAt
      }
    })
  ]);

  // Register 15-second grace window in Redis
  await redis.set(`token:grace:${presentedHash}`, nextHash, 'EX', 15);

  const membership = await prisma.teamMembership.findFirst({
    where: { userId: existing.userId, isActive: true }
  });

  const accessToken = issueAccessToken(
    existing.user,
    membership?.teamId ?? '',
    membership?.role ?? 'STAFF'
  );

  return { accessToken, refreshToken: nextRawToken };
}
```

---

## 4. Server-Side Tenant & RBAC Middleware

In `server/src/middleware/tenant-context.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { PrismaClient, Role } from '@prisma/client';

export function createTenantMiddleware(prisma: PrismaClient, redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user; // attached by authMiddleware
    const teamId = req.params.teamId || req.body.teamId || user?.teamId;

    if (!user || !teamId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing user or team context.' }
      });
      return;
    }

    const cacheKey = `team:${teamId}:user:${user.sub}:role`;
    let role = await redis.get(cacheKey);

    if (!role) {
      const membership = await prisma.teamMembership.findUnique({
        where: { teamId_userId: { teamId, userId: user.sub } }
      });

      if (!membership || !membership.isActive) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No active membership in target team.' }
        });
        return;
      }

      role = membership.role;
      await redis.set(cacheKey, role, 'EX', 60);
    }

    (req as any).tenant = { teamId, role: role as Role, userId: user.sub };
    next();
  };
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).tenant?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_INSUFFICIENT_ROLE', message: 'Insufficient role permissions.' }
      });
      return;
    }
    next();
  };
}
```

---

## 5. Mobile Token Storage & Axios Interceptor

In `app/src/storage/secure-tokens.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'rota_access_token';
const REFRESH_KEY = 'rota_refresh_token';

export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearAuthTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
```

In `app/src/api/client.ts`:

```typescript
import axios from 'axios';
import { getAccessToken, getRefreshToken, saveAuthTokens, clearAuthTokens } from '../storage/secure-tokens';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

apiClient.interceptors.request.use(async config => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

        const { data } = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/refresh`, {
          refreshToken
        });

        await saveAuthTokens(data.data.accessToken, data.data.refreshToken);
        processQueue(null, data.data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await clearAuthTokens();
        // Trigger navigation to login
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 6. Verification Checklist

1. **Grace Window Concurrency**: Fire 3 simultaneous refresh requests with the same token. All 3 must succeed without invalidating the token family.
2. **Replay Outside Grace Window**: Present a revoked token after 16 seconds. Verify entire family is revoked and returns HTTP 401 `TOKEN_REUSE_DETECTED`.
3. **Hardware Storage Validation**: Run `npx expo-doctor` and verify zero unencrypted token references in bundle.
