import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { createPooledPrismaClient } from './pool';
import { redis } from '../config/redis';

/**
 * ============================================================================
 * Read-Your-Own-Writes Database Router
 * ============================================================================
 * 
 * Replicas typically lag behind primary PostgreSQL nodes by a few milliseconds
 * to several seconds. To prevent the notorious "disappearing update" anomaly
 * (where a user posts a new shift or swap, refreshes immediately, and sees stale
 * replica data), we enforce Read-Your-Own-Writes consistency:
 * 
 * 1. Any write mutation (POST, PUT, PATCH, DELETE) sets a Redis flag:
 *    `user:<userId>:recent_write` with a 5-second TTL.
 * 2. Any subsequent read (GET) within that 5-second window is routed directly
 *    to `primaryClient`.
 * 3. Read requests outside the 5-second window are safely offloaded to `replicaClient`.
 */

const primaryUrl = process.env.DATABASE_PRIMARY_URL || process.env.DATABASE_URL || 'file:./dev.db';
const replicaUrl = process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL || 'file:./dev.db';

// Primary Client for all writes and recent-write reads
export const primaryClient: PrismaClient = createPooledPrismaClient(primaryUrl);

// Replica Client for read-only queries
export const replicaClient: PrismaClient =
  process.env.DATABASE_REPLICA_URL
    ? createPooledPrismaClient(replicaUrl)
    : primaryClient; // Fallback to primary if separate replica not provisioned

export const RECENT_WRITE_TTL_SECONDS = 5;

/**
 * Sets user recent-write flag in Redis with a 5-second TTL.
 */
export async function markUserRecentWrite(userId: string, ttlSeconds = RECENT_WRITE_TTL_SECONDS): Promise<void> {
  if (!userId) return;
  try {
    const key = `user:${userId}:recent_write`;
    await redis.set(key, '1', 'EX', ttlSeconds);
  } catch (err) {
    // If Redis is temporarily unreachable, silently log so request isn't blocked
    console.warn(`[Router] Failed to set recent_write flag for user ${userId}:`, (err as Error).message);
  }
}

/**
 * Checks whether user has performed a write within the last 5 seconds.
 */
export async function hasUserRecentWrite(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const key = `user:${userId}:recent_write`;
    const val = await redis.get(key);
    return val !== null;
  } catch (err) {
    // If Redis is down, fail open to primaryClient for maximum consistency
    return true;
  }
}

/**
 * Read-Your-Own-Writes Express Middleware.
 * 
 * - Mutations (POST, PUT, PATCH, DELETE):
 *   Sets user recent-write flag in Redis (5-sec TTL) and assigns primaryClient.
 * 
 * - Reads (GET):
 *   Checks Redis for recent-write flag.
 *   If YES -> routes to primaryClient.
 *   If NO  -> routes to replicaClient.
 */
export async function readYourOwnWritesMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const method = req.method.toUpperCase();
  const userId = req.user?.sub || req.tenant?.userId || (req.headers['x-user-id'] as string);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Mutation: Always use primaryClient
    (req as any).db = primaryClient;
    (req as any).routedTo = 'primary';

    if (userId) {
      // Set recent-write flag in Redis
      await markUserRecentWrite(userId);
    }
    return next();
  }

  // Read request (GET, HEAD, OPTIONS):
  if (userId) {
    const isRecentWriter = await hasUserRecentWrite(userId);
    if (isRecentWriter) {
      (req as any).db = primaryClient;
      (req as any).routedTo = 'primary';
      res.setHeader('X-DB-Route', 'primary-recent-write');
      return next();
    }
  }

  // Default read: route to replicaClient
  (req as any).db = replicaClient;
  (req as any).routedTo = 'replica';
  res.setHeader('X-DB-Route', 'replica');
  return next();
}

/**
 * Retrieves the routed PrismaClient from the request context or falls back to primaryClient.
 */
export function getPrismaClient(req?: AuthenticatedRequest): PrismaClient {
  if (req && (req as any).db) {
    return (req as any).db as PrismaClient;
  }
  return primaryClient;
}
