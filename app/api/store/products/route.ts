import { NextRequest, NextResponse } from 'next/server';
import { getProductCatalog } from '@/lib/database/queries';

// Use Demo Store organization shop domain
// This links the store API to the "Stylr Demo Store" organization
// Matches the shop domain used in lib/store/store-products.ts
const STORE_SHOP_DOMAIN = process.env.STORE_SHOP_DOMAIN || 'demo-store.stylr.app';
const FALLBACK_SHOP_DOMAIN = 'test-store.myshopify.com';

/**
 * Transform database product to store product format
 */
function transformProduct(dbProduct: any) {
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
    category: dbProduct.category?.toLowerCase() || 'uncategorized',
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const productId = searchParams.get('id');
    const featured = searchParams.get('featured') === 'true';

    // Fetch products from database
    let products = await getProductCatalog(STORE_SHOP_DOMAIN);
    
    // Fallback to test-store if demo-store has no products
    if (products.length === 0 && STORE_SHOP_DOMAIN !== FALLBACK_SHOP_DOMAIN) {
      products = await getProductCatalog(FALLBACK_SHOP_DOMAIN);
    }

    if (productId) {
      // Return single product
      const product = products.find((p) => p.id === productId);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(transformProduct(product));
    }

    // Filter products
    let filteredProducts = products;

    if (category && category !== 'all') {
      filteredProducts = products.filter(
        (p) => p.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (featured) {
      filteredProducts = filteredProducts.filter(
        (p) => p.metadata?.featured === true
      );
    }

    // Transform and return products
    const transformedProducts = filteredProducts.map(transformProduct);

    return NextResponse.json({
      products: transformedProducts,
      total: transformedProducts.length,
    });
  } catch (error: any) {
    console.error('Error fetching store products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', message: error.message },
      { status: 500 }
    );
  }
}

