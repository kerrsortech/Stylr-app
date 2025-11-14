import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { catalogSources } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { testCatalogSource, getSourceStats } from '@/lib/integrations/catalog-fetcher';

const CreateSourceSchema = z.object({
  adminEmail: z.string().email(),
  name: z.string().min(1),
  sourceType: z.enum([
    'shopify',
    'woocommerce',
    'bigcommerce',
    'magento',
    'csv',
    'api_rest',
    'api_custom',
  ]),
  connectionConfig: z.record(z.any()),
  schemaMapping: z.record(z.string()).optional(),
  cacheEnabled: z.boolean().optional().default(true),
  cacheTtlSeconds: z.number().optional().default(300),
});

// GET - List catalog sources
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');

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

    const sources = await db
      .select()
      .from(catalogSources)
      .where(eq(catalogSources.shopDomain, org.shopDomain))
      .orderBy(catalogSources.createdAt);

    // Map sources to include categoryCount from metadata
    const sourcesWithStats = sources.map(source => ({
      ...source,
      categoryCount: (source.metadata as any)?.categoryCount || 0,
    }));

    return NextResponse.json({ sources: sourcesWithStats });
  } catch (error: any) {
    logger.error('List catalog sources error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

// POST - Create catalog source
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateSourceSchema.parse(body);

    const org = await getOrganizationByAdminEmail(data.adminEmail);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Test connection first
    const testResult = await testCatalogSource(data.sourceType, data.connectionConfig);
    if (!testResult.success) {
      return NextResponse.json(
        { error: `Connection test failed: ${testResult.error}` },
        { status: 400 }
      );
    }

    // Get product count and categories
    let productCount = 0;
    let categoryCount = 0;
    try {
      const stats = await getSourceStats(
        data.sourceType,
        data.connectionConfig,
        data.schemaMapping
      );
      productCount = stats.productCount;
      categoryCount = stats.categoryCount;
    } catch (error: any) {
      logger.warn('Failed to get source stats during creation', { error });
      // Continue anyway - we can sync later
    }

    // Create source
    const [source] = await db
      .insert(catalogSources)
      .values({
        shopDomain: org.shopDomain,
        organizationName: org.organizationName,
        name: data.name,
        sourceType: data.sourceType,
        connectionConfig: data.connectionConfig,
        schemaMapping: data.schemaMapping || null,
        cacheEnabled: data.cacheEnabled,
        cacheTtlSeconds: data.cacheTtlSeconds,
        status: 'active',
        productCount: productCount,
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
        metadata: {
          categoryCount: categoryCount,
        },
      })
      .returning();

    return NextResponse.json({ 
      source,
      productCount,
      categoryCount,
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Create catalog source error', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

