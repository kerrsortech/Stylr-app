import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { catalogSources } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { testCatalogSource, getSourceStats } from '@/lib/integrations/catalog-fetcher';

// POST - Test catalog source connection
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { adminEmail } = body;

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

    const [source] = await db
      .select()
      .from(catalogSources)
      .where(
        and(
          eq(catalogSources.id, parseInt(params.id)),
          eq(catalogSources.shopDomain, org.shopDomain)
        )
      )
      .limit(1);

    if (!source) {
      return NextResponse.json(
        { error: 'Catalog source not found' },
        { status: 404 }
      );
    }

    // Test connection
    const testResult = await testCatalogSource(
      source.sourceType,
      source.connectionConfig as any
    );

    // Update source status based on test result
    if (testResult.success) {
      // Get product count and categories
      let productCount = source.productCount || 0;
      let categoryCount = 0;
      try {
        const stats = await getSourceStats(
          source.sourceType,
          source.connectionConfig as any,
          source.schemaMapping as any
        );
        productCount = stats.productCount;
        categoryCount = stats.categoryCount;
      } catch (error: any) {
        logger.warn('Failed to get source stats during test', { error });
        // Continue with existing values
        categoryCount = (source.metadata as any)?.categoryCount || 0;
      }

      await db
        .update(catalogSources)
        .set({
          status: 'active',
          lastSyncStatus: 'success',
          lastSyncError: null,
          productCount: productCount,
          lastSyncAt: new Date(),
          metadata: {
            ...(source.metadata as any || {}),
            categoryCount: categoryCount,
          },
          updatedAt: new Date(),
        })
        .where(eq(catalogSources.id, source.id));

      return NextResponse.json({
        ...testResult,
        productCount,
        categoryCount,
      });
    } else {
      await db
        .update(catalogSources)
        .set({
          status: 'error',
          lastSyncStatus: 'error',
          lastSyncError: testResult.error || 'Connection test failed',
          updatedAt: new Date(),
        })
        .where(eq(catalogSources.id, source.id));

      return NextResponse.json(testResult);
    }
  } catch (error: any) {
    logger.error('Test catalog source error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

