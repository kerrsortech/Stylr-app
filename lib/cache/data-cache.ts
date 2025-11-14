/**
 * Simple in-memory cache for frequently accessed data
 * Cache TTL: 5 minutes for product catalog, 30 minutes for policies/guidelines
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CATALOG_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly POLICY_TTL = 30 * 60 * 1000; // 30 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CATALOG_TTL,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const dataCache = new DataCache();

// Cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    dataCache.cleanup();
  }, 10 * 60 * 1000);
}

// Cache key generators
export function getCatalogCacheKey(shopDomain: string): string {
  return `catalog:${shopDomain}`;
}

export function getPoliciesCacheKey(shopDomain: string): string {
  return `policies:${shopDomain}`;
}

export function getBrandGuidelinesCacheKey(shopDomain: string): string {
  return `brand-guidelines:${shopDomain}`;
}

