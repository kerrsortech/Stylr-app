/**
 * WooCommerce adapter for fetching products from WooCommerce REST API
 */

import { CatalogAdapter, Product } from './base-adapter';
import { mapProduct, SchemaMapping } from './schema-mapper';
import { logger } from '@/lib/utils/logger';

interface WooCommerceConfig {
  url: string; // Store URL (e.g., "https://mystore.com")
  consumerKey: string;
  consumerSecret: string;
  apiVersion?: string;
}

export class WooCommerceAdapter implements CatalogAdapter {
  async fetchProducts(
    config: WooCommerceConfig,
    schemaMapping?: SchemaMapping,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      const apiVersion = config.apiVersion || 'wc/v3';
      const baseUrl = config.url.replace(/\/$/, '');
      const page = Math.floor(offset / limit) + 1;
      const url = `${baseUrl}/wp-json/wc/${apiVersion}/products?per_page=${limit}&page=${page}`;

      // WooCommerce uses Basic Auth
      const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
      }

      const products = await response.json();
      const total = parseInt(response.headers.get('x-wp-total') || '0', 10);
      const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '0', 10);

      // Map WooCommerce products to our format
      const mappedProducts: Product[] = products.map((wp: any) => {
        const mapping: SchemaMapping = schemaMapping || {
          productId: 'id',
          title: 'name',
          description: 'description',
          price: 'price',
          category: 'categories',
          type: 'type',
          vendor: 'vendor',
          tags: 'tags',
          images: 'images',
          variants: 'variations',
          inStock: 'stock_status',
        };

        // Handle WooCommerce structure
        const mappedProduct = {
          id: String(wp.id),
          name: wp.name || '',
          description: wp.description || '',
          price: wp.price ? Math.round(parseFloat(wp.price) * 100) : 0,
          categories: wp.categories?.map((c: any) => c.name) || [],
          type: wp.type || 'simple',
          vendor: wp.vendor || '',
          tags: wp.tags?.map((t: any) => t.name) || [],
          images: wp.images?.map((img: any) => img.src) || [],
          variations: wp.variations || [],
          stock_status: wp.stock_status || 'instock',
          stock_quantity: wp.stock_quantity,
        };

        return mapProduct(mappedProduct, mapping);
      });

      return {
        products: mappedProducts,
        total,
        hasMore: page < totalPages,
      };
    } catch (error: any) {
      logger.error('WooCommerce adapter error', error);
      throw new Error(`Failed to fetch products from WooCommerce: ${error.message}`);
    }
  }

  async testConnection(config: WooCommerceConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const apiVersion = config.apiVersion || 'wc/v3';
      const baseUrl = config.url.replace(/\/$/, '');
      const url = `${baseUrl}/wp-json/wc/${apiVersion}/products?per_page=1`;

      const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
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

  async getProductCount(config: WooCommerceConfig): Promise<number | null> {
    try {
      const result = await this.fetchProducts(config, undefined, 1, 0);
      return result.total ?? null;
    } catch {
      return null;
    }
  }
}


