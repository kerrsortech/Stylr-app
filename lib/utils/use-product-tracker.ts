'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook to track product changes based on URL/pathname changes
 * Useful for React/Next.js apps where product changes with route changes
 */
export function useProductTracker(
  getProductForPath: (pathname: string) => any | null,
  options?: {
    pollInterval?: number; // Poll interval in ms (default: 2000)
  }
) {
  const pathname = usePathname();
  const [currentProduct, setCurrentProduct] = useState<any | null>(null);

  useEffect(() => {
    // Get initial product
    const product = getProductForPath(pathname);
    if (product) {
      setCurrentProduct(product);
    }

    // Poll for product changes (in case product data updates without route change)
    const pollInterval = options?.pollInterval || 2000;
    const interval = setInterval(() => {
      const product = getProductForPath(pathname);
      if (product) {
        setCurrentProduct((prev: any) => {
          // Only update if product actually changed
          if (JSON.stringify(prev) !== JSON.stringify(product)) {
            return product;
          }
          return prev;
        });
      }
    }, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [pathname, getProductForPath, options?.pollInterval]);

  return currentProduct;
}

