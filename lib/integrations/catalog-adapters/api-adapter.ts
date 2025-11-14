/**
 * REST API adapter for fetching products from any REST API endpoint
 */

import { CatalogAdapter, Product } from './base-adapter';
import { mapProduct, SchemaMapping } from './schema-mapper';
import { logger } from '@/lib/utils/logger';

interface ApiConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  apiKey?: string;
  apiSecret?: string;
  authType?: 'bearer' | 'basic' | 'header' | 'query';
  body?: any;
  pagination?: {
    type: 'query' | 'body' | 'header';
    limitParam?: string;
    offsetParam?: string;
    pageParam?: string;
  };
  productPath?: string; // JSON path to products array (e.g., "data.products")
  totalPath?: string; // JSON path to total count
}

export class ApiAdapter implements CatalogAdapter {
  async fetchProducts(
    config: ApiConfig,
    schemaMapping?: SchemaMapping,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      const url = new URL(config.url);
      
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };

      // Add authentication
      if (config.apiKey) {
        if (config.authType === 'bearer') {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        } else if (config.authType === 'header') {
          headers[config.apiSecret || 'X-API-Key'] = config.apiKey;
        } else if (config.authType === 'query') {
          url.searchParams.set('api_key', config.apiKey);
        }
      }

      // Add pagination
      if (config.pagination) {
        const { type, limitParam = 'limit', offsetParam = 'offset', pageParam = 'page' } = config.pagination;
        if (type === 'query') {
          url.searchParams.set(limitParam, String(limit));
          if (offsetParam) {
            url.searchParams.set(offsetParam, String(offset));
          } else if (pageParam) {
            url.searchParams.set(pageParam, String(Math.floor(offset / limit) + 1));
          }
        }
      }

      // Make request
      const response = await fetch(url.toString(), {
        method: config.method || 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract products array
      let productsArray: any[] = [];
      if (config.productPath) {
        const parts = config.productPath.split('.');
        let value = data;
        for (const part of parts) {
          value = value?.[part];
        }
        productsArray = Array.isArray(value) ? value : [];
      } else if (Array.isArray(data)) {
        productsArray = data;
      } else if (data.products && Array.isArray(data.products)) {
        productsArray = data.products;
      } else if (data.data && Array.isArray(data.data)) {
        productsArray = data.data;
      }

      // Extract total count
      let total: number | undefined;
      if (config.totalPath) {
        const parts = config.totalPath.split('.');
        let value = data;
        for (const part of parts) {
          value = value?.[part];
        }
        total = typeof value === 'number' ? value : undefined;
      } else if (typeof data.total === 'number') {
        total = data.total;
      } else if (typeof data.count === 'number') {
        total = data.count;
      }

      // Map products to standard format
      const mappedProducts = productsArray.map((product) =>
        mapProduct(product, schemaMapping || {})
      );

      const hasMore = total ? offset + limit < total : productsArray.length === limit;

      return {
        products: mappedProducts,
        total,
        hasMore,
      };
    } catch (error: any) {
      logger.error('API adapter error', error);
      throw new Error(`Failed to fetch products from API: ${error.message}`);
    }
  }

  async testConnection(config: ApiConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const url = new URL(config.url);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };

      if (config.apiKey && config.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(url.toString(), {
        method: config.method || 'GET',
        headers,
      });

      return {
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProductCount(config: ApiConfig): Promise<number | null> {
    try {
      const result = await this.fetchProducts(config, undefined, 1, 0);
      return result.total ?? null;
    } catch {
      return null;
    }
  }
}


