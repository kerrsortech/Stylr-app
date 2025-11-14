import { db } from '@/lib/database/db';
import { tickets } from '@/lib/database/schema';
import { logger } from '@/lib/utils/logger';
import { createServerError } from '@/lib/utils/error-handler';
import { v4 as uuidv4 } from 'uuid';
import { sendTicketEmail } from '@/lib/integrations/email-service';
import { getOrganizationByShopDomain } from '@/lib/database/organization-queries';
import { fetchUserDetails } from '@/lib/integrations/auth-integration';

export interface TicketData {
  sessionId: string;
  shopDomain: string;
  customerId?: string;
  customerEmail?: string;
  issueCategory: string;
  issueDescription: string;
  metadata?: {
    currentProduct?: any;
    conversationContext?: string;
  };
}

/**
 * Create a support ticket
 */
export async function createTicket(data: TicketData): Promise<string> {
  try {
    const ticketId = `TKT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Fetch user details from authentication platform
    let userDetails = null;
    if (data.customerId || data.customerEmail) {
      try {
        userDetails = await fetchUserDetails(
          data.shopDomain,
          data.customerId,
          data.customerEmail
        );
      } catch (error) {
        logger.warn('Failed to fetch user details for ticket', { error });
        // Continue without user details
      }
    }

    // Get organization to get organizationName and admin email
    const org = await getOrganizationByShopDomain(data.shopDomain);
    if (!org) {
      throw createServerError(`Organization not found for shop domain: ${data.shopDomain}`, 'ORG_NOT_FOUND');
    }

    // Prepare metadata with user details
    const metadata = {
      ...(data.metadata || {}),
      userDetails: userDetails ? {
        id: userDetails.id,
        email: userDetails.email,
        name: userDetails.name,
      } : null,
    };

    const [ticket] = await db
      .insert(tickets)
      .values({
        ticketId,
        sessionId: data.sessionId,
        shopDomain: data.shopDomain,
        organizationName: org.organizationName, // Required field
        customerId: userDetails?.id || data.customerId || null,
        customerEmail: userDetails?.email || data.customerEmail || null,
        customerName: userDetails?.name || null,
        issueCategory: data.issueCategory,
        issueDescription: data.issueDescription,
        status: 'open',
        priority: determinePriority(data.issueDescription),
        metadata: metadata,
      })
      .returning();
    const adminEmail = org?.adminEmail || process.env.ADMIN_EMAIL;

    // Send email notification to organization's admin email
    try {
      await sendTicketEmail({
        ticketId,
        shopDomain: data.shopDomain,
        issueCategory: data.issueCategory,
        issueDescription: data.issueDescription,
        customerEmail: userDetails?.email || data.customerEmail,
        customerName: userDetails?.name,
        customerId: userDetails?.id || data.customerId,
        adminEmail: adminEmail, // Use organization's admin email
      });
    } catch (emailError) {
      logger.error('Failed to send ticket email', emailError);
      // Don't fail ticket creation if email fails
    }

    logger.info('Ticket created', { 
      ticketId, 
      shopDomain: data.shopDomain,
      customerId: userDetails?.id || data.customerId,
      customerName: userDetails?.name,
    });

    return ticketId;
  } catch (error: any) {
    logger.error('Failed to create ticket', error);
    throw createServerError('Failed to create support ticket', 'TICKET_CREATE_ERROR');
  }
}

/**
 * Determine ticket priority based on description
 */
function determinePriority(description: string): 'low' | 'medium' | 'high' | 'urgent' {
  const lower = description.toLowerCase();
  
  const urgentKeywords = ['urgent', 'asap', 'immediately', 'broken', 'not working', 'defective'];
  const highKeywords = ['issue', 'problem', 'wrong', 'missing', 'damaged'];
  const lowKeywords = ['question', 'inquiry', 'info', 'information'];

  if (urgentKeywords.some(kw => lower.includes(kw))) {
    return 'urgent';
  }
  if (highKeywords.some(kw => lower.includes(kw))) {
    return 'high';
  }
  if (lowKeywords.some(kw => lower.includes(kw))) {
    return 'low';
  }

  return 'medium';
}

/**
 * Extract ticket information from assistant response
 */
export function extractTicketInfo(response: string): {
  hasTicket: boolean;
  ticketId?: string;
  issue?: string;
} {
  const ticketMatch = response.match(/__TICKET_CREATE__\s*ISSUE:\s*(.+?)\s*CONTEXT:\s*(.+?)\s*__TICKET_END__/s);
  
  if (ticketMatch) {
    return {
      hasTicket: true,
      issue: ticketMatch[1].trim(),
    };
  }

  // Check for ticket ID in response
  const ticketIdMatch = response.match(/ticket\s*#?([A-Z0-9-]+)/i);
  if (ticketIdMatch) {
    return {
      hasTicket: true,
      ticketId: ticketIdMatch[1],
    };
  }

  return { hasTicket: false };
}

