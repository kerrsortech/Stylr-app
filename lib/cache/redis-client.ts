import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is not set');
    }
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error', error);
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

