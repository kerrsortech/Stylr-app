import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts as getDemoProducts } from '@/lib/store/demo-products';

/**
 * Transform demo product to store product format
 */
function transformDemoProduct(demoProduct: any) {
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
    images: demoProduct.images || [], // These should be /Product_images/... paths from demo-products.ts
    image: demoProduct.images?.[0] || '', // Add image field for compatibility
    imageUrl: demoProduct.images?.[0] || '', // Add imageUrl field for compatibility
    thumbnail: demoProduct.images?.[0] || '', // Add thumbnail field for compatibility
    colors: [{ name: demoProduct.color || 'Default', hex: colorHex }],
    sizes: demoProduct.sizes || ['One Size'],
    inStock: true,
    featured: false,
    tags: [demoProduct.category, demoProduct.type, demoProduct.color].filter(Boolean),
    vendor: 'Demo Store',
    type: demoProduct.type,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const productId = searchParams.get('id');
    const featured = searchParams.get('featured') === 'true';

    // Use unified demo products directly
    const demoProducts = getDemoProducts();
    const products = demoProducts.map(transformDemoProduct);

    if (productId) {
      // Return single product
      const product = products.find((p) => p.id === productId);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(product);
    }

    // Filter products
    let filteredProducts = products;

    if (category && category !== 'all') {
      filteredProducts = products.filter(
        (p) => p.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (featured) {
      // For now, return all products (you can add featured flag to demo products later)
      filteredProducts = products;
    }

    return NextResponse.json({
      products: filteredProducts,
      total: filteredProducts.length,
    });
  } catch (error: any) {
    console.error('Error fetching store products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', message: error.message },
      { status: 500 }
    );
  }
}

