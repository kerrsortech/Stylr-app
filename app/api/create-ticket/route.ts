import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/chatbot/ticket-handler';
import { getConversation } from '@/lib/cache/session-manager';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const RequestSchema = z.object({
  sessionId: z.string().min(1),
  shopDomain: z.string().min(1),
  customerId: z.string().optional(),
  issueCategory: z.string().min(1),
  issueDescription: z.string().min(1),
  currentProduct: z.any().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, shopDomain, customerId, issueCategory, issueDescription, currentProduct } = 
      RequestSchema.parse(body);

    // Get conversation history for context
    let conversationHistory: any[] = [];
    try {
      conversationHistory = await getConversation(sessionId);
    } catch (error) {
      logger.warn('Failed to get conversation history for ticket', { error });
    }

    // Create the ticket
    const ticketId = await createTicket({
      sessionId,
      shopDomain,
      customerId,
      issueCategory,
      issueDescription,
      metadata: {
        currentProduct,
        conversationContext: conversationHistory.map(m => m.content).join('\n'),
      },
    });

    logger.info('Ticket created successfully', { ticketId, shopDomain, issueCategory });

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Ticket created successfully',
    });
  } catch (error: any) {
    logger.error('Create ticket API error', {
      error: error.message,
      stack: error.stack,
    });
    
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

