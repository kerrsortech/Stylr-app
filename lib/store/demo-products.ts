/**
 * Demo Products Helper
 * Fetches products from database for demo store
 * This is separate from the plugin core and can be easily removed later
 */

import { getProductCatalog } from '@/lib/database/queries';

const DEMO_SHOP_DOMAIN = 'demo-store.stylr.app';

export interface DemoProduct {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number; // in dollars
  originalPrice?: number;
  category: string;
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  inStock: boolean;
  featured: boolean;
  tags: string[];
  vendor?: string;
  type?: string;
}

/**
 * Convert database product to store product format
 */
function convertToStoreProduct(dbProduct: any): DemoProduct {
  const variants = dbProduct.variants || {};
  const colors = variants.color || [];
  const sizes = variants.size || ['One Size'];
  
  // Extract colors with hex codes if available
  const colorOptions = Array.isArray(colors)
    ? colors.map((c: any) => {
        if (typeof c === 'string') {
          return { name: c, hex: '#000000' };
        }
        return {
          name: c.name || c.value || 'Unknown',
          hex: c.hex || '#000000',
        };
      })
    : [{ name: 'Default', hex: '#000000' }];

  return {
    id: dbProduct.id,
    name: dbProduct.title,
    title: dbProduct.title,
    description: dbProduct.description || '',
    price: dbProduct.price / 100, // Convert cents to dollars
    category: dbProduct.category || 'Uncategorized',
    images: dbProduct.images || [],
    colors: colorOptions,
    sizes: Array.isArray(sizes) ? sizes : [sizes],
    inStock: dbProduct.inStock !== false,
    featured: dbProduct.metadata?.featured === true,
    tags: dbProduct.tags || [],
    vendor: dbProduct.vendor,
    type: dbProduct.type,
  };
}

/**
 * Get all demo products from database
 */
export async function getDemoProducts(): Promise<DemoProduct[]> {
  try {
    const products = await getProductCatalog(DEMO_SHOP_DOMAIN);
    return products.map(convertToStoreProduct);
  } catch (error) {
    console.error('Failed to fetch demo products:', error);
    return [];
  }
}

/**
 * Get demo product by ID
 */
export async function getDemoProductById(id: string): Promise<DemoProduct | null> {
  try {
    const products = await getProductCatalog(DEMO_SHOP_DOMAIN);
    const product = products.find((p) => p.id === id);
    return product ? convertToStoreProduct(product) : null;
  } catch (error) {
    console.error('Failed to fetch demo product:', error);
    return null;
  }
}

/**
 * Get demo products by category
 */
export async function getDemoProductsByCategory(category: string): Promise<DemoProduct[]> {
  try {
    const products = await getProductCatalog(DEMO_SHOP_DOMAIN);
    const filtered = category === 'all' 
      ? products 
      : products.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
    return filtered.map(convertToStoreProduct);
  } catch (error) {
    console.error('Failed to fetch demo products by category:', error);
    return [];
  }
}

/**
 * Get featured demo products
 */
export async function getFeaturedDemoProducts(): Promise<DemoProduct[]> {
  try {
    const products = await getProductCatalog(DEMO_SHOP_DOMAIN);
    const featured = products.filter((p) => p.metadata?.featured === true);
    return featured.map(convertToStoreProduct);
  } catch (error) {
    console.error('Failed to fetch featured demo products:', error);
    return [];
  }
}

