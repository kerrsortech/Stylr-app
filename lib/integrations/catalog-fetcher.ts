/**
 * Catalog Fetcher Service
 * Fetches products from various catalog sources with caching
 * 
 * This file should only be used on the server side (API routes, server components)
 */

import { db } from '@/lib/database/db';
import { catalogSources, productCatalog } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { CatalogAdapter, Product } from './catalog-adapters/base-adapter';
import { ShopifyAdapter } from './catalog-adapters/shopify-adapter';
import { WooCommerceAdapter } from './catalog-adapters/woocommerce-adapter';
import { ApiAdapter } from './catalog-adapters/api-adapter';
import { CsvAdapter } from './catalog-adapters/csv-adapter';
import { getRedisClient } from '@/lib/cache/redis-client';
import { sql } from 'drizzle-orm';

// Lazy load database adapters to avoid bundling pg, mysql2, mongodb on client
let PostgreSQLAdapter: any;
let MySQLAdapter: any;
let MongoDBAdapter: any;

async function loadDatabaseAdapters() {
  if (!PostgreSQLAdapter) {
    const dbAdapters = await import('./catalog-adapters/database-adapter');
    PostgreSQLAdapter = dbAdapters.PostgreSQLAdapter;
    MySQLAdapter = dbAdapters.MySQLAdapter;
    MongoDBAdapter = dbAdapters.MongoDBAdapter;
  }
  return { PostgreSQLAdapter, MySQLAdapter, MongoDBAdapter };
}

interface FetchOptions {
  limit?: number;
  offset?: number;
  useCache?: boolean;
  cacheTtl?: number;
}

/**
 * Internal Database Adapter
 * Uses the existing drizzle connection to query product_catalog table directly
 */
class InternalDatabaseAdapter implements CatalogAdapter {
  async fetchProducts(
    config: any,
    schemaMapping: any,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      const shopDomain = config.shopDomain;
      if (!shopDomain) {
        throw new Error('shopDomain is required for internal database adapter');
      }

      // Fetch products directly from product_catalog table
      const products = await db
        .select()
        .from(productCatalog)
        .where(eq(productCatalog.shopDomain, shopDomain))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(productCatalog)
        .where(eq(productCatalog.shopDomain, shopDomain));
      
      const total = Number(countResult[0]?.count || 0);

      // Map to Product format
      const mappedProducts: Product[] = products.map((p) => ({
        id: p.productId,
        title: p.title,
        description: p.description || '',
        price: p.price,
        category: p.category || '',
        type: p.type || '',
        vendor: p.vendor || '',
        tags: p.tags || [],
        images: p.images || [],
        variants: p.variants || {},
        inStock: p.inStock !== false,
        metadata: p.metadata || {},
      }));

      return {
        products: mappedProducts,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error: any) {
      logger.error('Internal database adapter error', error);
      throw new Error(`Failed to fetch products from internal database: ${error.message}`);
    }
  }

  async testConnection(config: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Just verify we can query the table
      await db.select().from(productCatalog).limit(1);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProductCount(config: any): Promise<number | null> {
    try {
      const shopDomain = config.shopDomain;
      if (!shopDomain) {
        return null;
      }

      const result = await db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(productCatalog)
        .where(eq(productCatalog.shopDomain, shopDomain));
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      logger.error('Failed to get product count', error);
      return null;
    }
  }
}

/**
 * Get adapter for a source type
 */
async function getAdapter(sourceType: string, connectionConfig?: any): Promise<CatalogAdapter> {
  // Check if this is an internal database source
  if (connectionConfig?.type === 'internal') {
    return new InternalDatabaseAdapter();
  }

  switch (sourceType) {
    case 'shopify':
      return new ShopifyAdapter();
    case 'woocommerce':
      return new WooCommerceAdapter();
    case 'bigcommerce':
    case 'magento':
    case 'api_rest':
    case 'api_custom':
      // BigCommerce and Magento use REST APIs, so we can use ApiAdapter
      return new ApiAdapter();
    case 'csv':
      return new CsvAdapter();
    case 'database_postgresql':
      const { PostgreSQLAdapter: PGAdapter } = await loadDatabaseAdapters();
      return new PGAdapter();
    case 'database_mysql':
      const { MySQLAdapter: MySQLAdap } = await loadDatabaseAdapters();
      return new MySQLAdap();
    case 'database_mongodb':
      const { MongoDBAdapter: MongoAdap } = await loadDatabaseAdapters();
      return new MongoAdap();
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }
}

/**
 * Fetch products from a catalog source
 */
export async function fetchProductsFromSource(
  shopDomain: string,
  sourceId?: number,
  options: FetchOptions = {}
): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
  const { limit = 100, offset = 0, useCache = true, cacheTtl } = options;

  // Get catalog source
  let source;
  if (sourceId) {
    [source] = await db
      .select()
      .from(catalogSources)
      .where(
        and(
          eq(catalogSources.id, sourceId),
          eq(catalogSources.shopDomain, shopDomain),
          eq(catalogSources.status, 'active')
        )
      )
      .limit(1);
  } else {
    // Get first active source
    [source] = await db
      .select()
      .from(catalogSources)
      .where(
        and(
          eq(catalogSources.shopDomain, shopDomain),
          eq(catalogSources.status, 'active')
        )
      )
      .limit(1);
  }

  if (!source) {
    throw new Error('No active catalog source found');
  }

  // Check cache
  if (useCache && source.cacheEnabled) {
    try {
      const redis = await getRedisClient();
      const cacheKey = `catalog:${shopDomain}:${source.id}:${limit}:${offset}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Redis not available, continue without cache
      logger.warn('Redis cache unavailable', { error });
    }
  }

  try {
    // Get adapter (pass connection config to check for internal type)
    const adapter = await getAdapter(source.sourceType, source.connectionConfig as any);

    // For internal database adapter, we need to pass shopDomain
    const config = source.connectionConfig as any;
    if (config?.type === 'internal') {
      config.shopDomain = shopDomain;
    }

    // Fetch products
    const result = await adapter.fetchProducts(
      config,
      source.schemaMapping as any,
      limit,
      offset
    );

    // Cache result
    if (useCache && source.cacheEnabled) {
      try {
        const redis = await getRedisClient();
        const cacheKey = `catalog:${shopDomain}:${source.id}:${limit}:${offset}`;
        const ttl = cacheTtl || source.cacheTtlSeconds || 300;
        await redis.setex(cacheKey, ttl, JSON.stringify(result));
      } catch (error) {
        // Redis not available, continue without cache
        logger.warn('Redis cache unavailable', { error });
      }
    }

    return result;
  } catch (error: any) {
    logger.error('Catalog fetcher error', error);
    
    // Update source status on error
    await db
      .update(catalogSources)
      .set({
        status: 'error',
        lastSyncError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(catalogSources.id, source.id));

    throw error;
  }
}

/**
 * Get all products from all active sources (for chatbot)
 */
export async function getAllProducts(shopDomain: string): Promise<Product[]> {
  const sources = await db
    .select()
    .from(catalogSources)
    .where(
      and(
        eq(catalogSources.shopDomain, shopDomain),
        eq(catalogSources.status, 'active')
      )
    );

  const allProducts: Product[] = [];
  const seenIds = new Set<string>();

  for (const source of sources) {
    try {
      const adapter = await getAdapter(source.sourceType, source.connectionConfig as any);
      
      // For internal database adapter, we need to pass shopDomain
      const config = source.connectionConfig as any;
      if (config?.type === 'internal') {
        config.shopDomain = shopDomain;
      }
      
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const result = await adapter.fetchProducts(
          config,
          source.schemaMapping as any,
          100,
          offset
        );

        // Deduplicate products by ID
        for (const product of result.products) {
          if (!seenIds.has(product.id)) {
            seenIds.add(product.id);
            allProducts.push(product);
          }
        }

        hasMore = result.hasMore;
        offset += result.products.length;

        // Safety limit
        if (allProducts.length > 10000) break;
      }
    } catch (error: any) {
      logger.error(`Failed to fetch from source ${source.id}`, error);
      // Continue with other sources
    }
  }

  return allProducts;
}

/**
 * Test connection to a catalog source
 */
export async function testCatalogSource(
  sourceType: string,
  connectionConfig: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const adapter = await getAdapter(sourceType, connectionConfig);
    return await adapter.testConnection(connectionConfig);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get product count and categories from a catalog source
 */
export async function getSourceStats(
  sourceType: string,
  connectionConfig: any,
  schemaMapping?: Record<string, string>
): Promise<{ productCount: number; categoryCount: number }> {
  try {
    const adapter = await getAdapter(sourceType, connectionConfig);
    
    // Get product count
    let productCount = 0;
    try {
      const count = await adapter.getProductCount(connectionConfig);
      productCount = count || 0;
    } catch (error) {
      // If getProductCount fails, try fetching a small batch
      try {
        const result = await adapter.fetchProducts(connectionConfig, schemaMapping, 1, 0);
        productCount = result.total || 0;
      } catch (err) {
        logger.warn('Failed to get product count', { error: err });
      }
    }

    // Get categories by fetching products and extracting unique categories
    let categoryCount = 0;
    try {
      const result = await adapter.fetchProducts(connectionConfig, schemaMapping, 100, 0);
      const categories = new Set<string>();
      
      for (const product of result.products) {
        if (product.category) {
          categories.add(product.category);
        }
      }

      // If we got more products, fetch more to get all categories
      if (result.hasMore) {
        let offset = 100;
        let hasMore = true;
        while (hasMore && categories.size < 1000) { // Limit to prevent infinite loops
          const nextResult = await adapter.fetchProducts(connectionConfig, schemaMapping, 100, offset);
          for (const product of nextResult.products) {
            if (product.category) {
              categories.add(product.category);
            }
          }
          hasMore = nextResult.hasMore;
          offset += 100;
          
          // Safety limit
          if (offset > 10000) break;
        }
      }

      categoryCount = categories.size;
    } catch (error) {
      logger.warn('Failed to get category count', { error });
    }

    return {
      productCount,
      categoryCount,
    };
  } catch (error: any) {
    logger.error('Failed to get source stats', error);
    return {
      productCount: 0,
      categoryCount: 0,
    };
  }
}

