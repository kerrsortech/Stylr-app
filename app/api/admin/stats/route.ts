import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationStats, getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const RequestSchema = z.object({
  adminEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail } = RequestSchema.parse(body);

    logger.info('Admin stats request', { adminEmail });

    // Get organization by admin email
    let org;
    try {
      org = await getOrganizationByAdminEmail(adminEmail);
    } catch (dbError: any) {
      logger.error('Database error fetching organization', { error: dbError, adminEmail });
      // Check if it's a database connection error
      if (dbError?.message?.includes('connection') || dbError?.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL environment variable and ensure the database is running.',
            code: 'DB_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (!org) {
      logger.warn('Organization not found', { adminEmail });
      return NextResponse.json(
        { 
          error: `No organization found for email: ${adminEmail}. Please run 'npm run demo:setup' to create the demo organization.`,
          code: 'ORG_NOT_FOUND',
          suggestion: 'Run: npm run demo:setup'
        },
        { status: 404 }
      );
    }

    logger.info('Organization found', { shopDomain: org.shopDomain, orgName: org.organizationName });

    // Get stats for this organization
    const stats = await getOrganizationStats(org.shopDomain);
    if (!stats) {
      logger.error('Failed to fetch stats', { shopDomain: org.shopDomain });
      return NextResponse.json(
        { error: 'Failed to fetch organization stats. Please check the database connection.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      organization: {
        name: stats.organization.organizationName,
        shopDomain: stats.organization.shopDomain,
        status: stats.organization.status,
      },
      plan: {
        name: stats.plan?.name,
        displayName: stats.plan?.displayName,
        priceCents: stats.plan?.priceCents,
        imageResolution: stats.plan?.imageResolution,
      },
      usage: stats.usage,
    });
  } catch (error: any) {
    logger.error('Admin stats API error', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid email address', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

