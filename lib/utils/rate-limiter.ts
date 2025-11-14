import { getRedisClient } from '@/lib/cache/redis-client';
import { logger } from './logger';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
};

/**
 * Check if request is within rate limit
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const redis = getRedisClient();
    const key = `ratelimit:${identifier}:${endpoint}`;
    const ttl = Math.ceil(config.windowMs / 1000);

    // Increment counter
    const count = await redis.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await redis.expire(key, ttl);
    }

    const remaining = Math.max(0, config.maxRequests - count);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    logger.error('Rate limit check error', error);
    // On error, allow request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
    };
  }
}

/**
 * Middleware for API routes
 */
export function rateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request): Promise<Response | null> => {
    try {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      const endpoint = new URL(req.url).pathname;

      const { allowed, remaining, resetAt } = await checkRateLimit(
        ip,
        endpoint,
        fullConfig
      );

      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: 'Too many requests. Please try again later.',
            resetAt,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': String(fullConfig.maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(resetAt),
            },
          }
        );
      }

      return null; // Allow request to proceed
    } catch (error) {
      logger.error('Rate limit middleware error', error);
      return null; // Fail open
    }
  };
}

