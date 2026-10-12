import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5 && process.env.NODE_ENV === 'test') {
      return null; // Stop retrying in test mode
    }
    return Math.min(times * 200, 3000);
  }
});

redisConnection.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[Redis] Connection warning:', err.message);
  }
});

export const redis = redisConnection;

