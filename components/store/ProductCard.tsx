'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { StoreProduct } from '@/lib/store/store-products';

interface ProductCardProps {
  product: StoreProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentImageIndex(0);
      }}
    >
      <Link href={`/store/products/${product.id}`}>
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100 rounded-lg">
          {/* Product Image */}
          <div className="relative w-full h-full">
            <Image
              src={product.images[currentImageIndex] || product.images[0]}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-500 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>

          {/* Favorite button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsFavorite(!isFavorite);
            }}
            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors z-10"
          >
            <Heart
              className={`h-5 w-5 ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </button>

          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
              -{discount}%
            </div>
          )}

          {/* Image navigation on hover */}
          {isHovered && product.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {product.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentImageIndex(index);
                  }}
                  className={`h-2 w-2 rounded-full transition-all ${
                    currentImageIndex === index ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-900 line-clamp-1">
              {product.name}
            </h3>
          </div>
          <p className="text-sm text-gray-500 line-clamp-1">{product.category}</p>
          <div className="flex items-center space-x-2">
            {product.originalPrice && (
              <span className="text-base text-gray-400 line-through">
                ${product.originalPrice}
              </span>
            )}
            <span className="text-base font-semibold text-gray-900">${product.price}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

