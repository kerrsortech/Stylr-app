import { NextRequest, NextResponse } from 'next/server';
import { getDemoProductById } from '@/lib/store/demo-products';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id') || 'DEMO-AIR-MAX-90';

    const product = await getDemoProductById(productId);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Failed to fetch demo product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

