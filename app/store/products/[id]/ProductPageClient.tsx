'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import type { StoreProduct } from '@/lib/store/store-products';
import { ShoppingBag, Heart, Share2, Minus, Plus } from 'lucide-react';
import Link from 'next/link';

interface ProductPageClientProps {
  product: StoreProduct;
  relatedProducts: StoreProduct[];
}

export function ProductPageClient({ product, relatedProducts }: ProductPageClientProps) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="text-sm text-gray-500">
          <Link href="/store" className="hover:text-gray-900">
            Home
          </Link>
          {' / '}
          <Link href={`/store?category=${product.category}`} className="hover:text-gray-900 capitalize">
            {product.category}
          </Link>
          {' / '}
          <span className="text-gray-900">{product.name}</span>
        </nav>
      </div>

      {/* Product Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={product.images[mainImageIndex] || product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm font-semibold">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setMainImageIndex(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    mainImageIndex === index
                      ? 'border-black'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 25vw, 12.5vw"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-lg text-gray-600 capitalize">{product.category}</p>
            </div>

            {/* Price */}
            <div className="flex items-center space-x-4">
              {product.originalPrice && (
                <span className="text-2xl text-gray-400 line-through">
                  ${product.originalPrice}
                </span>
              )}
              <span className="text-3xl font-bold text-gray-900">${product.price}</span>
              {discount > 0 && (
                <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-semibold">
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <div className="space-y-4">
                {/* Key Features - Extract from description */}
                {(() => {
                  const description = product.description || '';
                  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
                  
                  // Extract key features (sentences that mention specific features)
                  const featureKeywords = [
                    'insulated', 'water-resistant', 'breathable', 'adjustable', 'pockets',
                    'hood', 'zip', 'closure', 'protection', 'technology', 'foam', 'cushioning',
                    'lightweight', 'durable', 'traction', 'comfort', 'support', 'performance'
                  ];
                  
                  const keyFeatures = sentences
                    .filter(sentence => 
                      featureKeywords.some(keyword => 
                        sentence.toLowerCase().includes(keyword)
                      )
                    )
                    .slice(0, 6) // Limit to 6 key features
                    .map(s => s.trim());
                  
                  const otherSentences = sentences
                    .filter(sentence => 
                      !featureKeywords.some(keyword => 
                        sentence.toLowerCase().includes(keyword)
                      )
                    )
                    .map(s => s.trim());
                  
                  return (
                    <>
                      {keyFeatures.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Features</h4>
                          <ul className="space-y-2">
                            {keyFeatures.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-black mr-2 mt-1.5">•</span>
                                <span className="text-gray-600 text-sm leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {otherSentences.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Overview</h4>
                          <div className="space-y-2">
                            {otherSentences.map((sentence, index) => (
                              <p key={index} className="text-gray-600 text-sm leading-relaxed">
                                {sentence}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback if no features extracted */}
                      {keyFeatures.length === 0 && otherSentences.length === 0 && (
                        <p className="text-gray-600 leading-relaxed">{description}</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Color: <span className="font-normal">{selectedColor?.name}</span>
              </h3>
              <div className="flex space-x-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={`w-12 h-12 rounded-full border-2 transition-all ${
                      selectedColor?.name === color.name
                        ? 'border-black scale-110'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Select Size</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-4 border-2 rounded transition-all ${
                      selectedSize === size
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Quantity</h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                className="w-full bg-black text-white hover:bg-gray-800 h-14 text-lg font-semibold rounded-full"
                disabled={!selectedSize || !product.inStock}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Add to Bag
              </Button>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-full"
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Heart
                    className={`h-5 w-5 mr-2 ${
                      isFavorite ? 'fill-red-500 text-red-500' : ''
                    }`}
                  />
                  Favorite
                </Button>
                <Button variant="outline" className="flex-1 h-12 rounded-full">
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Stock Status */}
            {!product.inStock && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 font-semibold">Out of Stock</p>
                <p className="text-sm text-red-600 mt-1">
                  This item is currently unavailable.
                </p>
              </div>
            )}

            {/* Product Tags */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="text-3xl font-bold mb-8">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/store/products/${relatedProduct.id}`}
                  className="group"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-100 rounded-lg mb-3">
                    <Image
                      src={relatedProduct.images[0]}
                      alt={relatedProduct.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{relatedProduct.name}</h3>
                  <p className="text-sm text-gray-500 capitalize mb-2">{relatedProduct.category}</p>
                  <p className="font-semibold text-gray-900">${relatedProduct.price}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

