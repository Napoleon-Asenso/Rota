import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3 && (process.env.NODE_ENV === 'test' || !process.env.REDIS_URL)) {
      return null; // Stop retrying when no live Redis server is running
    }
    return Math.min(times * 200, 2000);
  }
});

let isRedisConnected = false;

redisConnection.on('ready', () => {
  isRedisConnected = true;
});

redisConnection.on('close', () => {
  isRedisConnected = false;
});

redisConnection.on('error', (err) => {
  isRedisConnected = false;
  if (process.env.NODE_ENV !== 'test' && process.env.REDIS_URL) {
    console.warn('[Redis] Connection warning:', err.message);
  }
});

// In-Memory fallback store for environments without a running Redis server
const memoryStore = new Map<string, { value: string; expiresAt?: number }>();

function cleanExpiredKeys(): void {
  const now = Date.now();
  for (const [key, item] of memoryStore.entries()) {
    if (item.expiresAt && item.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Resilient Redis Client that seamlessly delegates to live Redis or
 * in-memory storage when Redis is unavailable or unprovisioned.
 */
export const redis = {
  get connection(): Redis {
    return redisConnection;
  },

  async get(key: string): Promise<string | null> {
    if (isRedisConnected) {
      try {
        return await redisConnection.get(key);
      } catch {
        // Fall back to memory
      }
    }
    cleanExpiredKeys();
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    if (isRedisConnected) {
      try {
        if (mode === 'EX' && duration) {
          return await redisConnection.set(key, value, 'EX', duration);
        }
        return await redisConnection.set(key, value);
      } catch {
        // Fall back to memory
      }
    }
    const expiresAt = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
    memoryStore.set(key, { value, expiresAt });
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    if (isRedisConnected) {
      try {
        return await redisConnection.del(...keys);
      } catch {
        // Fall back to memory
      }
    }
    let count = 0;
    for (const k of keys) {
      if (memoryStore.delete(k)) count++;
    }
    return count;
  },

  async keys(pattern: string): Promise<string[]> {
    if (isRedisConnected) {
      try {
        return await redisConnection.keys(pattern);
      } catch {
        // Fall back to memory
      }
    }
    cleanExpiredKeys();
    // Convert glob pattern (e.g. "team:*:shifts:*") to regex
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched: string[] = [];
    for (const key of memoryStore.keys()) {
      if (regexPattern.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }
};
