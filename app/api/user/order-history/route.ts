import { NextRequest, NextResponse } from 'next/server';
import { fetchUserOrderHistory } from '@/lib/integrations/auth-integration';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const RequestSchema = z.object({
  shopDomain: z.string().min(1),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopDomain, customerId, customerEmail } = RequestSchema.parse(body);

    if (!customerId && !customerEmail) {
      return NextResponse.json(
        { error: 'Either customerId or customerEmail is required' },
        { status: 400 }
      );
    }

    // Fetch order history from the e-commerce platform
    const orderHistory = await fetchUserOrderHistory(
      shopDomain,
      customerId,
      customerEmail
    );

    if (!orderHistory) {
      return NextResponse.json({
        orders: [],
        totalOrders: 0,
        message: 'No order history found or integration not configured',
      });
    }

    logger.info('Order history fetched', {
      shopDomain,
      customerId,
      totalOrders: orderHistory.totalOrders,
    });

    return NextResponse.json(orderHistory);
  } catch (error: any) {
    logger.error('Order history API error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

