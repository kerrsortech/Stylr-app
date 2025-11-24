import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { db } from '@/lib/database/db';
import { productCatalog } from '@/lib/database/schema';
import { eq, sql } from 'drizzle-orm';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { getAllProducts } from '@/lib/integrations/catalog-fetcher';
import { demoProducts } from '@/lib/store/demo-products';

// GET - Get product catalog for organization
// Fetches from catalog sources first, then falls back to database
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Increased limit to show all products
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'adminEmail is required' },
        { status: 400 }
      );
    }

    const org = await getOrganizationByAdminEmail(adminEmail);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    let products: any[] = [];
    let total = 0;

    // Try to fetch from catalog sources first
    try {
      const sourceProducts = await getAllProducts(org.shopDomain);
      
      if (sourceProducts.length > 0) {
        // Map to consistent format
        products = sourceProducts
          .slice(offset, offset + limit)
          .map(p => ({
            id: p.id,
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
        
        total = sourceProducts.length;
        
        return NextResponse.json({
          products,
          total,
          hasMore: offset + limit < total,
          limit,
          offset,
        });
      }
    } catch (error) {
      logger.warn('Failed to fetch from catalog sources, falling back to database', { error });
    }

    // Fallback to database (for backward compatibility)
    const dbProducts = await db
      .select()
      .from(productCatalog)
      .where(eq(productCatalog.shopDomain, org.shopDomain))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(productCatalog)
      .where(eq(productCatalog.shopDomain, org.shopDomain));
    
    total = Number(countResult[0]?.count || 0);

    // Map to consistent format
    products = dbProducts.map(p => ({
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

    // If no products found in database, fall back to demo products
    if (products.length === 0) {
      const demoProductsList = demoProducts.slice(offset, offset + limit);
      products = demoProductsList.map(p => ({
        id: p.id,
        title: p.name,
        description: p.description || '',
        price: Math.round(p.price * 100), // Convert to cents
        category: p.category || '',
        type: p.type || '',
        vendor: 'Demo Store',
        tags: [p.color, p.type].filter(Boolean),
        images: p.images || [],
        variants: {
          sizes: p.sizes || [],
          color: p.color || '',
        },
        inStock: true,
        metadata: {
          color: p.color,
          sizes: p.sizes,
        },
      }));
      total = demoProducts.length;
    }

    return NextResponse.json({
      products,
      total,
      hasMore: offset + limit < total,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('Get products error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

