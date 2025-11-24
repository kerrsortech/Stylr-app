import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { tryOnHistory, sessions } from '@/lib/database/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';

const RequestSchema = z.object({
  adminEmail: z.string().email(),
  productId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, productId } = RequestSchema.parse(body);

    logger.info('Product users API called', { adminEmail, productId });

    // Get organization by admin email
    let org;
    try {
      org = await getOrganizationByAdminEmail(adminEmail);
    } catch (orgError: any) {
      logger.error('Error fetching organization', { error: orgError, adminEmail });
      const { status, body: errorBody } = handleApiError(orgError);
      return NextResponse.json(errorBody, { status });
    }

    if (!org) {
      logger.warn('Organization not found', { adminEmail });
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const shopDomain = org.shopDomain;

    // Get try-on history for this product
    const tryOnRecords = await db
      .select({
        sessionId: tryOnHistory.sessionId,
        customerId: tryOnHistory.customerId,
        createdAt: tryOnHistory.createdAt,
      })
      .from(tryOnHistory)
      .where(
        and(
          eq(tryOnHistory.shopDomain, shopDomain),
          eq(tryOnHistory.productId, productId)
        )
      )
      .orderBy(desc(tryOnHistory.createdAt))
      .limit(100); // Limit to 100 most recent

    // Get session details to get user emails and names
    const sessionIds = tryOnRecords
      .map(r => r.sessionId)
      .filter((id): id is string => Boolean(id));

    const sessionMap = new Map<string, { customerEmail?: string | null; customerName?: string | null }>();
    if (sessionIds.length > 0) {
      const sessionData = await db
        .select({
          sessionId: sessions.sessionId,
          customerEmail: sessions.customerEmail,
          customerName: sessions.customerName,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.shopDomain, shopDomain),
            inArray(sessions.sessionId, sessionIds)
          )
        );

      for (const session of sessionData) {
        sessionMap.set(session.sessionId, {
          customerEmail: session.customerEmail,
          customerName: session.customerName,
        });
      }
    }

    // For demo purposes, always generate fake demo data
    // This ensures we show realistic demo data for the presentation
    // Check if we have real data, but always generate fake data for demo
    const hasRealData = tryOnRecords.length > 0;
    
    logger.info('Generating fake demo data for presentation', { 
      productId, 
      realUsersCount: tryOnRecords.length,
      hasRealData 
    });
    
    // Always generate fake demo data for demo purposes
    const users: Array<{ name: string; email: string; triedOnAt: Date }> = [];
    
    // Generate fake demo users
    const fakeNames = [
      'John Smith',
      'Sarah Johnson',
      'Michael Chen',
      'Emily Rodriguez',
      'David Williams',
      'Jessica Martinez',
      'Robert Taylor',
      'Amanda Brown',
      'James Wilson',
      'Lisa Anderson',
      'Christopher Lee',
      'Michelle Garcia',
      'Daniel Moore',
      'Ashley Jackson',
      'Matthew Thompson',
    ];

    const fakeEmails = [
      'john.smith@email.com',
      'sarah.j@email.com',
      'mchen@email.com',
      'emily.r@email.com',
      'david.w@email.com',
      'jessica.m@email.com',
      'robert.t@email.com',
      'amanda.b@email.com',
      'james.w@email.com',
      'lisa.a@email.com',
      'chris.lee@email.com',
      'michelle.g@email.com',
      'daniel.m@email.com',
      'ashley.j@email.com',
      'matt.thompson@email.com',
    ];

    // Generate 18 fake users with random timestamps in the last 30 days
    // Use fixed count for consistent demo experience
    const fakeUserCount = 18;
    const now = new Date();
    
    // Generate fake demo data
    for (let i = 0; i < fakeUserCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);
      const triedOnDate = new Date(now);
      triedOnDate.setDate(triedOnDate.getDate() - daysAgo);
      triedOnDate.setHours(triedOnDate.getHours() - hoursAgo);
      triedOnDate.setMinutes(triedOnDate.getMinutes() - minutesAgo);

      // Use different names and emails for each user (cycle through arrays)
      const nameIndex = i % fakeNames.length;
      const emailIndex = i % fakeEmails.length;

      users.push({
        name: fakeNames[nameIndex],
        email: fakeEmails[emailIndex],
        triedOnAt: triedOnDate,
      });
    }

    // Sort by most recent
    users.sort((a, b) => new Date(b.triedOnAt).getTime() - new Date(a.triedOnAt).getTime());

    return NextResponse.json({
      users: users.map(u => ({
        name: u.name,
        email: u.email,
        triedOnAt: u.triedOnAt instanceof Date ? u.triedOnAt.toISOString() : u.triedOnAt,
      })),
      total: users.length,
    });
  } catch (error: any) {
    logger.error('Product users API error', {
      error: error.message,
      stack: error.stack,
    });
    
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

