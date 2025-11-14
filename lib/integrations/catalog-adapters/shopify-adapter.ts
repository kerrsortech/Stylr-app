/**
 * Shopify adapter for fetching products from Shopify API
 */

import { CatalogAdapter, Product } from './base-adapter';
import { mapProduct, SchemaMapping } from './schema-mapper';
import { logger } from '@/lib/utils/logger';

interface ShopifyConfig {
  shopDomain: string; // e.g., "mystore.myshopify.com"
  accessToken: string;
  apiVersion?: string;
}

export class ShopifyAdapter implements CatalogAdapter {
  async fetchProducts(
    config: ShopifyConfig,
    schemaMapping?: SchemaMapping,
    limit: number = 250,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      const apiVersion = config.apiVersion || '2024-01';
      const shopDomain = config.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const url = `https://${shopDomain}/admin/api/${apiVersion}/products.json?limit=${limit}&since_id=${offset}`;

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': config.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const shopifyProducts = data.products || [];

      // Map Shopify products to our format
      const products: Product[] = shopifyProducts.map((sp: any) => {
        // Use provided mapping or default Shopify mapping
        const mapping: SchemaMapping = schemaMapping || {
          productId: 'id',
          title: 'title',
          description: 'body_html',
          price: 'variants[0].price',
          category: 'product_type',
          vendor: 'vendor',
          tags: 'tags',
          images: 'images',
          variants: 'variants',
          inStock: 'variants[0].inventory_quantity',
        };

        // Handle Shopify-specific structure
        const mappedProduct = {
          id: String(sp.id),
          title: sp.title || '',
          description: sp.body_html || '',
          price: sp.variants?.[0]?.price ? Math.round(parseFloat(sp.variants[0].price) * 100) : 0,
          category: sp.product_type || '',
          type: sp.product_type || '',
          vendor: sp.vendor || '',
          tags: sp.tags ? sp.tags.split(',').map((t: string) => t.trim()) : [],
          images: sp.images?.map((img: any) => img.src) || [],
          variants: sp.variants || [],
          inStock: (sp.variants?.[0]?.inventory_quantity ?? 0) > 0,
          metadata: {
            handle: sp.handle,
            status: sp.status,
            publishedAt: sp.published_at,
          },
        };

        return mapProduct(mappedProduct, mapping);
      });

      // Check if there are more products
      const hasMore = shopifyProducts.length === limit;

      return {
        products,
        hasMore,
      };
    } catch (error: any) {
      logger.error('Shopify adapter error', error);
      throw new Error(`Failed to fetch products from Shopify: ${error.message}`);
    }
  }

  async testConnection(config: ShopifyConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const apiVersion = config.apiVersion || '2024-01';
      const shopDomain = config.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const url = `https://${shopDomain}/admin/api/${apiVersion}/shop.json`;

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': config.accessToken,
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

  async getProductCount(config: ShopifyConfig): Promise<number | null> {
    try {
      const apiVersion = config.apiVersion || '2024-01';
      const shopDomain = config.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const url = `https://${shopDomain}/admin/api/${apiVersion}/products/count.json`;

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': config.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.count || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}


