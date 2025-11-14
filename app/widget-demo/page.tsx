'use client';

import { useState, useEffect } from 'react';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { getOrCreateSessionId } from '@/lib/utils/session';

export default function WidgetDemoPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);
  const shopDomain = 'test-store.myshopify.com';
  const apiUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const currentProduct = {
    id: 'prod-123',
    title: 'Classic Leather Jacket',
    price: 19900,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
    category: 'Jackets',
    inStock: true,
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Chat Widget - Floating in bottom-right */}
      <ChatWidget
        apiUrl={apiUrl}
        sessionId={sessionId}
        shopDomain={shopDomain}
        currentProduct={currentProduct}
      />
      
      {/* Simple page content */}
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4">Widget Demo</h1>
        <p className="text-muted-foreground mb-8">
          The chat widget is visible in the bottom-right corner. 
          Click the chat button to interact with it.
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Product: Classic Leather Jacket</h2>
          <p className="text-lg text-muted-foreground mb-4">
            This is a demo product page. The chat widget is embedded and ready to use.
          </p>
          <p className="text-sm text-muted-foreground">
            Try asking: &quot;Show me similar jackets&quot; or &quot;What colors are available?&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

