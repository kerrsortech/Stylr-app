import { Suspense } from 'react';
import { ProductCard } from '@/components/store/ProductCard';
import { getStoreProducts, getStoreProductsByCategory } from '@/lib/store/store-products';
import Image from 'next/image';

interface StorePageProps {
  searchParams: { category?: string };
}

async function ProductGrid({ category }: { category?: string }) {
  // Always fetch from database
  let products;
  if (category) {
    products = await getStoreProductsByCategory(category);
  } else {
    // For featured products section, prioritize featured items
    const allProducts = await getStoreProducts();
    // Sort: featured first, then others
    products = allProducts.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }

  // Limit to 10 products for landing page if no category filter
  const displayProducts = category ? products : products.slice(0, 10);

  if (displayProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found. Please ensure products are added to the database.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {displayProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default function StorePage({ searchParams }: StorePageProps) {
  const category = searchParams.category;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] bg-gradient-to-br from-gray-900 to-gray-700 text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&h=1080&fit=crop"
            alt="Hero"
            fill
            className="object-cover opacity-50"
            priority
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Just Do It.
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Find Your Perfect Fit
            </p>
            <a
              href="#products"
              className="inline-block bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Now
            </a>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {category ? `${category.charAt(0).toUpperCase() + category.slice(1)}'s Collection` : 'Featured Products'}
            </h2>
            <p className="text-gray-600">
              {category
                ? `Discover our latest ${category} collection`
                : 'Shop the latest styles and innovations'}
            </p>
          </div>

          <Suspense fallback={<div className="text-center py-12">Loading products...</div>}>
            <ProductGrid category={category || undefined} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
