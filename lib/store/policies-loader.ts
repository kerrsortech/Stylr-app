import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/utils/logger';

// In-memory cache for policies to avoid repeated file reads
let cachedPolicies: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load store policies from the local file
 * Uses in-memory caching to avoid repeated file system reads
 */
export function loadStorePolicies(): string | null {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedPolicies && (now - cacheTimestamp) < CACHE_TTL) {
      return cachedPolicies;
    }

    // Read from file
    const policiesPath = join(process.cwd(), 'lib', 'store', 'Standard Shipping:.md');
    const policiesContent = readFileSync(policiesPath, 'utf-8');
    
    // Update cache
    cachedPolicies = policiesContent;
    cacheTimestamp = now;
    
    logger.info('Store policies loaded from file', {
      path: policiesPath,
      contentLength: policiesContent.length,
    });
    
    return policiesContent;
  } catch (error: any) {
    logger.error('Failed to load store policies from file', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Clear the policies cache (useful for testing or when file is updated)
 */
export function clearPoliciesCache(): void {
  cachedPolicies = null;
  cacheTimestamp = 0;
}

