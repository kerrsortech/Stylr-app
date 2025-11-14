/**
 * Base adapter interface for catalog integrations
 * All platform-specific adapters should implement this interface
 */

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number; // in cents
  category?: string;
  type?: string;
  vendor?: string;
  tags?: string[];
  images?: string[];
  variants?: any;
  inStock?: boolean;
  metadata?: Record<string, any>;
}

export interface CatalogAdapter {
  /**
   * Fetch products from the source
   * @param config Connection configuration
   * @param schemaMapping Schema mapping to transform products
   * @param limit Optional limit for pagination
   * @param offset Optional offset for pagination
   */
  fetchProducts(
    config: any,
    schemaMapping?: Record<string, string>,
    limit?: number,
    offset?: number
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }>;

  /**
   * Test the connection to the source
   */
  testConnection(config: any): Promise<{ success: boolean; error?: string }>;

  /**
   * Get product count (if available)
   */
  getProductCount(config: any): Promise<number | null>;
}


