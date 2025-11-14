/**
 * Store Products Helper
 * Fetches products from database for the Nike-style demo store
 * This replaces the hardcoded mock products
 */

import { getProductCatalog } from '@/lib/database/queries';

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
 * Get all store products from database
 */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  try {
    let products = await getProductCatalog(STORE_SHOP_DOMAIN);
    
    // Fallback to test-store if demo-store has no products
    if (products.length === 0 && STORE_SHOP_DOMAIN !== FALLBACK_SHOP_DOMAIN) {
      console.log(`No products found in ${STORE_SHOP_DOMAIN}, trying ${FALLBACK_SHOP_DOMAIN}`);
      products = await getProductCatalog(FALLBACK_SHOP_DOMAIN);
    }
    
    return products.map(transformProduct);
  } catch (error) {
    console.error('Failed to fetch store products:', error);
    // Try fallback if primary fails
    try {
      if (STORE_SHOP_DOMAIN !== FALLBACK_SHOP_DOMAIN) {
        const products = await getProductCatalog(FALLBACK_SHOP_DOMAIN);
        return products.map(transformProduct);
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    return [];
  }
}

/**
 * Get store product by ID
 */
export async function getStoreProductById(id: string): Promise<StoreProduct | null> {
  try {
    let products = await getProductCatalog(STORE_SHOP_DOMAIN);
    let product = products.find((p) => p.id === id);
    
    // Try fallback if not found
    if (!product && STORE_SHOP_DOMAIN !== FALLBACK_SHOP_DOMAIN) {
      products = await getProductCatalog(FALLBACK_SHOP_DOMAIN);
      product = products.find((p) => p.id === id);
    }
    
    return product ? transformProduct(product) : null;
  } catch (error) {
    console.error('Failed to fetch store product:', error);
    // Try fallback if primary fails
    try {
      if (STORE_SHOP_DOMAIN !== FALLBACK_SHOP_DOMAIN) {
        const products = await getProductCatalog(FALLBACK_SHOP_DOMAIN);
        const product = products.find((p) => p.id === id);
        return product ? transformProduct(product) : null;
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    return null;
  }
}

/**
 * Get store products by category
 */
export async function getStoreProductsByCategory(category: string): Promise<StoreProduct[]> {
  try {
    let products = await getProductCatalog(STORE_SHOP_DOMAIN);
    
    // Fallback to test-store if demo-store has no products
    if (products.length === 0 && STORE_SHOP_DOMAIN !== FALLBACK_SHOP_DOMAIN) {
      products = await getProductCatalog(FALLBACK_SHOP_DOMAIN);
    }
    
    const allProducts = products.map(transformProduct);
    
    if (category === 'all') {
      return allProducts;
    }
    
    return allProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  } catch (error) {
    console.error('Failed to fetch store products by category:', error);
    // Try fallback if primary fails
    try {
      if (STORE_SHOP_DOMAIN !== FALLBACK_SHOP_DOMAIN) {
        const products = await getProductCatalog(FALLBACK_SHOP_DOMAIN);
        const allProducts = products.map(transformProduct);
        if (category === 'all') {
          return allProducts;
        }
        return allProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    return [];
  }
}

/**
 * Get featured store products
 */
export async function getFeaturedStoreProducts(): Promise<StoreProduct[]> {
  try {
    const products = await getProductCatalog(STORE_SHOP_DOMAIN);
    return products
      .filter((p) => p.metadata?.featured === true)
      .map(transformProduct);
  } catch (error) {
    console.error('Failed to fetch featured store products:', error);
    return [];
  }
}

