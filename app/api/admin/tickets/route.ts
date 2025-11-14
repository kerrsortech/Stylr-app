import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { tickets } from '@/lib/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const UpdateTicketSchema = z.object({
  adminEmail: z.string().email(),
  ticketId: z.string(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

// GET - List tickets for admin
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');
    const status = searchParams.get('status'); // Optional filter by status
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

    // Build query with optional status filter
    const conditions = status
      ? and(
          eq(tickets.shopDomain, org.shopDomain),
          eq(tickets.status, status as any)
        )
      : eq(tickets.shopDomain, org.shopDomain);

    const ticketList = await db
      .select()
      .from(tickets)
      .where(conditions)
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count with same filter
    const totalCountResult = await db
      .select()
      .from(tickets)
      .where(conditions);

    return NextResponse.json({
      tickets: ticketList,
      total: totalCountResult.length,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('List tickets error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

// PATCH - Update ticket status or priority
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = UpdateTicketSchema.parse(body);

    const org = await getOrganizationByAdminEmail(data.adminEmail);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get ticket
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.ticketId, data.ticketId),
          eq(tickets.shopDomain, org.shopDomain)
        )
      )
      .limit(1);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'resolved' || data.status === 'closed') {
        updateData.resolvedAt = new Date();
      }
    }

    if (data.priority) {
      updateData.priority = data.priority;
    }

    // Update ticket
    const [updatedTicket] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.ticketId, data.ticketId))
      .returning();

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error: any) {
    logger.error('Update ticket error', error);
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

