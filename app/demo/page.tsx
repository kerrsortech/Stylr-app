'use client';

import { useState, useEffect } from 'react';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { TryOnButton } from '@/components/widget/TryOnButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getOrCreateSessionId } from '@/lib/utils/session';
const DEMO_SHOP_DOMAIN = 'demo-store.stylr.app';
const DEMO_PRODUCT_ID = 'DEMO-AIR-MAX-90'; // Default to Air Max 90

export default function DemoPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    
    // Fetch demo product from API
    async function loadDemoProduct() {
      try {
        const response = await fetch(`/api/demo/product?id=${DEMO_PRODUCT_ID}`);
        if (response.ok) {
          const product = await response.json();
          setCurrentProduct({
            id: product.id,
            title: product.title,
            price: Math.round(product.price * 100), // Convert to cents
            image: product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
            category: product.category,
            description: product.description,
            inStock: product.inStock,
          });
        } else {
          throw new Error('Failed to fetch product');
        }
      } catch (error) {
        console.error('Failed to load demo product:', error);
        // Fallback to default product
        setCurrentProduct({
          id: DEMO_PRODUCT_ID,
          title: 'Air Max 90 Essential',
          price: 12000,
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
          category: 'Footwear',
          description: 'The Nike Air Max 90 stays true to its OG running roots with the iconic Waffle sole, stitched overlays and classic TPU accents.',
          inStock: true,
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadDemoProduct();
  }, []);
  
  const [shopDomain] = useState(DEMO_SHOP_DOMAIN);
  const [apiUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  });

  if (!sessionId || loading || !currentProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Closelook SDK Demo</h1>
          <p className="text-muted-foreground">
            Preview the chat widget and try-on button
          </p>
        </div>

        {/* Product Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Product Page Demo</CardTitle>
            <CardDescription>
              This simulates a product page where the chat widget would appear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product Image */}
              <div className="relative">
                <img
                  src={currentProduct.image}
                  alt={currentProduct.title}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
                <div className="mt-4">
                  <TryOnButton
                    apiUrl={apiUrl}
                    sessionId={sessionId}
                    shopDomain={shopDomain}
                    productId={currentProduct.id}
                    productImageUrl={currentProduct.image}
                  />
                </div>
              </div>

              {/* Product Info */}
              <div>
                <h2 className="text-3xl font-bold mb-2">{currentProduct.title}</h2>
                <p className="text-2xl font-semibold text-primary mb-4">
                  ${(currentProduct.price / 100).toFixed(2)}
                </p>
                <p className="text-muted-foreground mb-4">
                  {currentProduct.description}
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Category:</span> {currentProduct.category}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Status:</span>{' '}
                    <span className={currentProduct.inStock ? 'text-green-600' : 'text-red-600'}>
                      {currentProduct.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Information</CardTitle>
            <CardDescription>Current configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Session ID:</span> {sessionId}
              </p>
              <p>
                <span className="font-semibold">Shop Domain:</span> {shopDomain}
              </p>
              <p>
                <span className="font-semibold">API URL:</span> {apiUrl}
              </p>
              <p className="text-muted-foreground mt-4">
                The chat widget appears in the bottom-right corner. Click the chat button to open it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Widget - This will appear as a floating widget */}
      <ChatWidget
        apiUrl={apiUrl}
        sessionId={sessionId}
        shopDomain={shopDomain}
        currentProduct={currentProduct}
      />
    </div>
  );
}

