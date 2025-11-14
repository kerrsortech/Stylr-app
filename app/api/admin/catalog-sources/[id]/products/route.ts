import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { catalogSources } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { fetchProductsFromSource } from '@/lib/integrations/catalog-fetcher';

// GET - Fetch products from catalog source
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');
    const limit = parseInt(searchParams.get('limit') || '50');
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

    // Fetch products
    const result = await fetchProductsFromSource(
      org.shopDomain,
      parseInt(params.id),
      { limit, offset, useCache: true }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Fetch products error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}


