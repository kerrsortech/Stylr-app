import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { catalogSources } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { testCatalogSource, fetchProductsFromSource } from '@/lib/integrations/catalog-fetcher';

const UpdateSourceSchema = z.object({
  adminEmail: z.string().email(),
  name: z.string().min(1).optional(),
  connectionConfig: z.record(z.any()).optional(),
  schemaMapping: z.record(z.string()).optional(),
  cacheEnabled: z.boolean().optional(),
  cacheTtlSeconds: z.number().optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
});

// GET - Get catalog source
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    return NextResponse.json({ source });
  } catch (error: any) {
    logger.error('Get catalog source error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

// PATCH - Update catalog source
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data = UpdateSourceSchema.parse(body);

    const org = await getOrganizationByAdminEmail(data.adminEmail);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get existing source
    const [existing] = await db
      .select()
      .from(catalogSources)
      .where(
        and(
          eq(catalogSources.id, parseInt(params.id)),
          eq(catalogSources.shopDomain, org.shopDomain)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Catalog source not found' },
        { status: 404 }
      );
    }

    // Test connection if connection config is being updated
    if (data.connectionConfig) {
      const testResult = await testCatalogSource(existing.sourceType, data.connectionConfig);
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testResult.error}` },
          { status: 400 }
        );
      }
    }

    // Update source
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (data.name) updateData.name = data.name;
    if (data.connectionConfig) updateData.connectionConfig = data.connectionConfig;
    if (data.schemaMapping !== undefined) updateData.schemaMapping = data.schemaMapping;
    if (data.cacheEnabled !== undefined) updateData.cacheEnabled = data.cacheEnabled;
    if (data.cacheTtlSeconds !== undefined) updateData.cacheTtlSeconds = data.cacheTtlSeconds;
    if (data.status) updateData.status = data.status;

    const [source] = await db
      .update(catalogSources)
      .set(updateData)
      .where(eq(catalogSources.id, parseInt(params.id)))
      .returning();

    return NextResponse.json({ source });
  } catch (error: any) {
    logger.error('Update catalog source error', error);
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

// DELETE - Delete catalog source
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await db
      .delete(catalogSources)
      .where(
        and(
          eq(catalogSources.id, parseInt(params.id)),
          eq(catalogSources.shopDomain, org.shopDomain)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Delete catalog source error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}


