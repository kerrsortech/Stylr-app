import { ProductPageClient } from './ProductPageClient';
import { getStoreProductById, getStoreProductsByCategory } from '@/lib/store/store-products';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: { id: string };
}

export default async function ProductPage({ params }: ProductPageProps) {
  // Always fetch from database
  const product = await getStoreProductById(params.id);

  if (!product) {
    notFound();
  }

  // Get related products (same category, different product)
  const allCategoryProducts = await getStoreProductsByCategory(product.category);
  const relatedProducts = allCategoryProducts
    .filter(p => p.id !== product.id)
    .slice(0, 4);

  return <ProductPageClient product={product} relatedProducts={relatedProducts} />;
}
