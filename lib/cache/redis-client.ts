import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';

let redis: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

/**
 * Get Redis client, ensuring connection is ready before returning
 * This prevents operations from failing on first try
 */
export async function getRedisClient(): Promise<Redis> {
  // If we have an existing connection that's ready, return it
  if (redis && redis.status === 'ready') {
    return redis;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = createRedisConnection();
  return connectionPromise;
}

/**
 * Synchronous version for backward compatibility
 * WARNING: May return client that's not ready yet
 */
export function getRedisClientSync(): Redis {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is not set');
    }
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
      lazyConnect: true, // Don't connect immediately
      tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    });

    setupRedisEventHandlers(redis);
  }

  return redis;
}

async function createRedisConnection(): Promise<Redis> {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not set');
  }

  const client = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 30000,
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
  });

  setupRedisEventHandlers(client);

  // Wait for connection to be ready before returning
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Redis connection timeout'));
    }, 10000);

    if (client.status === 'ready') {
      clearTimeout(timeout);
      resolve();
      return;
    }

    client.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    client.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  redis = client;
  connectionPromise = null;
  return client;
}

function setupRedisEventHandlers(client: Redis): void {
  client.on('error', (error) => {
    logger.error('Redis connection error', error);
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('ready', () => {
    logger.info('Redis ready');
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
    // Reset connection state on close
    if (redis === client) {
      redis = null;
      connectionPromise = null;
    }
  });

  client.on('reconnecting', (delay) => {
    logger.info(`Redis reconnecting in ${delay}ms`);
  });
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

