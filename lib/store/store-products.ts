/**
 * Store Products Helper
 * Uses unified demo products directly (no database fetching)
 * All products come from the local demo-products.ts file
 */

import { getProductCatalog } from '@/lib/database/queries';
import { getAllProducts as getDemoProducts } from '@/lib/store/demo-products';

// Use Demo Store organization shop domain
// This links the store to the "Stylr Demo Store" organization
const STORE_SHOP_DOMAIN = process.env.STORE_SHOP_DOMAIN || 'demo-store.stylr.app';
const FALLBACK_SHOP_DOMAIN = 'test-store.myshopify.com';

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number; // in dollars
  originalPrice?: number;
  category: 'men' | 'women' | 'kids' | 'accessories' | string;
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
 * Transform database product to store product format
 */
function transformProduct(dbProduct: any): StoreProduct {
  const variants = dbProduct.variants || {};
  const colors = variants.color || [];
  const sizes = variants.size || ['One Size'];
  
  // Extract colors with hex codes if available
  const colorOptions = Array.isArray(colors)
    ? colors.map((c: any) => {
        if (typeof c === 'string') {
          // Try to map common color names to hex codes
          const colorMap: Record<string, string> = {
            'black': '#000000',
            'white': '#FFFFFF',
            'red': '#DC2626',
            'blue': '#2563EB',
            'navy': '#1E3A8A',
            'grey': '#6B7280',
            'gray': '#6B7280',
            'green': '#10B981',
            'brown': '#92400E',
            'pink': '#EC4899',
          };
          const lowerColor = c.toLowerCase();
          return {
            name: c,
            hex: colorMap[lowerColor] || '#000000',
          };
        }
        return {
          name: c.name || c.value || 'Unknown',
          hex: c.hex || '#000000',
        };
      })
    : [{ name: 'Default', hex: '#000000' }];

  // Map category to store category format
  // Try to preserve original category if it matches store categories
  const storeCategories = ['men', 'women', 'kids', 'accessories'];
  const dbCategory = dbProduct.category?.toLowerCase() || 'uncategorized';
  
  // If category already matches store category, use it
  let storeCategory = storeCategories.includes(dbCategory) 
    ? dbCategory 
    : 'men'; // Default to men if no match
  
  // Map common database categories to store categories
  const categoryMap: Record<string, string> = {
    'footwear': 'men',
    'apparel': 'men',
    'accessories': 'accessories',
    'jackets': 'men',
    'shoes': 'men',
    'sweaters': 'men',
    'shirts': 'men',
    'pants': 'men',
  };
  
  if (categoryMap[dbCategory]) {
    storeCategory = categoryMap[dbCategory];
  }

  // Extract original price from metadata if available
  const originalPrice = dbProduct.metadata?.originalPrice 
    ? dbProduct.metadata.originalPrice / 100 
    : undefined;

  return {
    id: dbProduct.id,
    name: dbProduct.title,
    description: dbProduct.description || '',
    price: dbProduct.price / 100, // Convert cents to dollars
    originalPrice,
    category: storeCategory,
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
 * Transform demo product to store product format
 */
function transformDemoProductToStoreProduct(demoProduct: any): StoreProduct {
  // Map color string to color object with hex
  const colorMap: Record<string, string> = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#DC2626',
    'blue': '#2563EB',
    'navy': '#1E3A8A',
    'navy blue': '#1E3A8A',
    'grey': '#6B7280',
    'gray': '#6B7280',
    'green': '#10B981',
    'brown': '#92400E',
    'pink': '#EC4899',
    'burgundy': '#800020',
    'beige': '#F5F5DC',
    'silver': '#C0C0C0',
    'sky blue': '#87CEEB',
    'navy/white': '#1E3A8A',
  };
  
  const colorName = (demoProduct.color || '').toLowerCase();
  const colorHex = colorMap[colorName] || '#000000';
  
  // Map category to store category format
  const categoryMap: Record<string, string> = {
    'pants': 'men',
    'shirts': 'men',
    'shoes': 'men',
    'coats': 'men',
    'accessories': 'accessories',
  };
  
  const storeCategory = categoryMap[demoProduct.category?.toLowerCase()] || 'men';
  
  return {
    id: demoProduct.id,
    name: demoProduct.name,
    description: demoProduct.description || '',
    price: demoProduct.price,
    category: storeCategory,
    images: demoProduct.images || [],
    colors: [{ name: demoProduct.color || 'Default', hex: colorHex }],
    sizes: demoProduct.sizes || ['One Size'],
    inStock: true,
    featured: false,
    tags: [demoProduct.category, demoProduct.type, demoProduct.color].filter(Boolean),
    vendor: 'Demo Store',
    type: demoProduct.type,
  };
}

/**
 * Get all store products
 * Uses unified demo products directly (no database fetching)
 */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  // Use unified demo products directly
  const demoProducts = getDemoProducts();
  return demoProducts.map(transformDemoProductToStoreProduct);
}

/**
 * Get store product by ID
 * Uses unified demo products directly (no database fetching)
 */
export async function getStoreProductById(id: string): Promise<StoreProduct | null> {
  const demoProducts = getDemoProducts();
  const demoProduct = demoProducts.find((p) => p.id === id);
  return demoProduct ? transformDemoProductToStoreProduct(demoProduct) : null;
}

/**
 * Get store products by category
 * Uses unified demo products directly (no database fetching)
 */
export async function getStoreProductsByCategory(category: string): Promise<StoreProduct[]> {
  const demoProducts = getDemoProducts();
  const allProducts = demoProducts.map(transformDemoProductToStoreProduct);
  
  if (category === 'all') {
    return allProducts;
  }
  
  return allProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get featured store products
 * Uses unified demo products directly (no database fetching)
 */
export async function getFeaturedStoreProducts(): Promise<StoreProduct[]> {
  const demoProducts = getDemoProducts();
  // For now, return all products (you can add a featured flag to demo products later)
  return demoProducts.map(transformDemoProductToStoreProduct);
}

