import { NextRequest, NextResponse } from 'next/server';
import { trackPurchase } from '@/lib/database/queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const RequestSchema = z.object({
  shopDomain: z.string().min(1),
  productId: z.string().min(1),
  sessionId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  quantity: z.number().int().positive().optional().default(1),
  priceCents: z.number().int().positive(),
  currency: z.string().optional().default('USD'),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RequestSchema.parse(body);

    // Track the purchase
    await trackPurchase({
      shopDomain: data.shopDomain,
      productId: data.productId,
      sessionId: data.sessionId || null,
      customerId: data.customerId || null,
      orderId: data.orderId || null,
      quantity: data.quantity,
      priceCents: data.priceCents,
      currency: data.currency,
      metadata: data.metadata || {},
    });

    logger.info('Purchase tracked', {
      shopDomain: data.shopDomain,
      productId: data.productId,
      orderId: data.orderId,
    });

    return NextResponse.json({
      success: true,
      message: 'Purchase tracked successfully',
    });
  } catch (error: any) {
    logger.error('Purchase tracking API error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

