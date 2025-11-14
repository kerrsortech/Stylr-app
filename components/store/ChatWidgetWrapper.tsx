'use client';

import { useState, useEffect } from 'react';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { getOrCreateSessionId } from '@/lib/utils/session';
import { usePathname } from 'next/navigation';

export function ChatWidgetWrapper() {
  const [sessionId, setSessionId] = useState<string>('loading');
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const id = getOrCreateSessionId();
      setSessionId(id);
      
      // Try to get customerId from localStorage or cookies
      // This will be set when user logs in
      const storedCustomerId = localStorage.getItem('customerId') || 
                                document.cookie.split('; ').find(row => row.startsWith('customerId='))?.split('=')[1];
      if (storedCustomerId) {
        setCustomerId(storedCustomerId);
      }
    } catch {
      setSessionId(`temp_${Date.now()}`);
    }
  }, []);

  useEffect(() => {
    if (sessionId === 'loading') return;
    const match = pathname?.match(/\/store\/products\/([^/]+)/);
    if (match) {
      const productId = match[1];
      fetch(`/api/store/products?id=${productId}`)
        .then(res => {
          if (!res.ok) {
            console.error('Failed to fetch product:', res.status);
            setCurrentProduct(null);
            return null;
          }
          return res.json();
        })
        .then(product => {
          if (product?.id) {
            // Ensure we have the image - try multiple possible fields
            const productImage = product.images?.[0] || 
                                product.image || 
                                product.imageUrl || 
                                product.thumbnail || 
                                '';
            
            console.log('Setting current product:', {
              id: product.id,
              name: product.name || product.title,
              hasImage: !!productImage,
              images: product.images,
            });
            
            setCurrentProduct({
              id: product.id,
              title: product.name || product.title,
              name: product.name || product.title, // Add name field for compatibility
              price: Math.round((product.price || 0) * 100),
              image: productImage,
              images: product.images || [], // Keep images array for reference
              category: product.category,
              type: product.type,
              description: product.description,
              inStock: product.inStock !== false,
              url: typeof window !== 'undefined' ? window.location.href : '',
            });
          } else {
            console.warn('Product fetched but missing id:', product);
            setCurrentProduct(null);
          }
        })
        .catch((error) => {
          console.error('Error fetching product:', error);
          setCurrentProduct(null);
        });
    } else {
      setCurrentProduct(null);
    }
  }, [pathname, sessionId]);

  if (sessionId === 'loading' || typeof window === 'undefined') {
    return null;
  }

  // Use Test Store organization shop domain for tracking and data
  // This ensures all tracking data (try-ons, conversations, etc.) is linked to the organization
  const SHOP_DOMAIN = 'test-store.myshopify.com';

  return (
    <ChatWidget
      apiUrl={window.location.origin}
      sessionId={sessionId}
      shopDomain={SHOP_DOMAIN}
      currentProduct={currentProduct || undefined}
      customerId={customerId}
    />
  );
}
