'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWidget } from '@/components/widget/ChatWidget';

function WidgetContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    
    // Function to get product from parent window
    const getProductFromParent = () => {
      if (window.parent && window.parent !== window) {
        try {
          const product = (window.parent as any).Closelook?.getCurrentProduct?.();
          if (product && product.title) {
            return product;
          }
        } catch (e) {
          // Cross-origin restrictions
        }
      }
      return null;
    };

    // Initial product fetch
    const product = getProductFromParent();
    if (product) {
      setCurrentProduct(product);
    }

    // Listen for product change messages from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PRODUCT_CHANGED') {
        const newProduct = event.data.product;
        if (newProduct && newProduct.title) {
          setCurrentProduct(newProduct);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Poll for product changes (fallback for cases where postMessage doesn't work)
    const pollInterval = setInterval(() => {
      const product = getProductFromParent();
      if (product && product.title) {
        setCurrentProduct((prev: any) => {
          // Only update if product actually changed
          if (JSON.stringify(prev) !== JSON.stringify(product)) {
            return product;
          }
          return prev;
        });
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pollInterval);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const sessionId = searchParams.get('sessionId') || 'default';
  const shopDomain = searchParams.get('shopDomain') || window.location.hostname;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

  return (
    <div className="w-full h-screen bg-transparent">
      <ChatWidget
        apiUrl={apiUrl}
        sessionId={sessionId}
        shopDomain={shopDomain}
        currentProduct={currentProduct}
      />
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-transparent" />}>
      <WidgetContent />
    </Suspense>
  );
}

