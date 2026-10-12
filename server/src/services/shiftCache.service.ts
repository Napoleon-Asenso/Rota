import { redis } from '../config/redis';

/**
 * ============================================================================
 * Redis Cache-Aside Service for Shift Calendars
 * ============================================================================
 * 
 * Shift rosters are read-heavy views with frequent concurrent mobile polling.
 * Using a Cache-Aside strategy:
 * 1. GET requests query Redis first (`team:<teamId}:shifts:<start>:<end>`).
 * 2. On Cache Hit: returns cached JSON in <2ms, bypassing DB.
 * 3. On Cache Miss: queries PostgreSQL, populates Redis (TTL: 60s), and returns.
 * 4. On Mutations (Shift created, Swap approved): invalidates all cache keys for the team.
 */

export const SHIFT_CACHE_TTL_SECONDS = 60; // 60 seconds TTL

export function buildShiftCacheKey(teamId: string, startDate?: string, endDate?: string): string {
  const start = startDate ? startDate.split('T')[0] : 'all';
  const end = endDate ? endDate.split('T')[0] : 'all';
  return `team:${teamId}:shifts:${start}:${end}`;
}

/**
 * Retrieves cached shifts from Redis.
 * Returns parsed array on hit, or null on miss or Redis failure.
 */
export async function getCachedShifts<T = unknown>(
  teamId: string,
  startDate?: string,
  endDate?: string
): Promise<T[] | null> {
  if (!teamId) return null;
  try {
    const key = buildShiftCacheKey(teamId, startDate, endDate);
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T[];
    }
  } catch (err) {
    // Fail open on Redis error -> return null so caller falls back to database
    console.warn('[ShiftCache] Redis get error, bypassing cache:', (err as Error).message);
  }
  return null;
}

/**
 * Sets shifts in Redis cache with an expiration TTL.
 */
export async function setCachedShifts<T = unknown>(
  teamId: string,
  shifts: T[],
  startDate?: string,
  endDate?: string,
  ttlSeconds: number = SHIFT_CACHE_TTL_SECONDS
): Promise<void> {
  if (!teamId || !shifts) return;
  try {
    const key = buildShiftCacheKey(teamId, startDate, endDate);
    const serialized = JSON.stringify(shifts);
    await redis.set(key, serialized, 'EX', ttlSeconds);
  } catch (err) {
    console.warn('[ShiftCache] Redis set error:', (err as Error).message);
  }
}

/**
 * Invalidates all cached shift entries for a specific team.
 * Triggered on shift creations, updates, cancellations, and swap approvals.
 */
export async function invalidateTeamShiftCache(teamId: string): Promise<void> {
  if (!teamId) return;
  try {
    const pattern = `team:${teamId}:shifts:*`;
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
      console.log(`[ShiftCache] Invalidated ${keys.length} cache keys for team ${teamId}`);
    }
  } catch (err) {
    console.warn('[ShiftCache] Redis invalidation error:', (err as Error).message);
  }
}
