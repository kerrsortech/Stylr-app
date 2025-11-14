export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number; // in cents
  category?: string;
  type?: string;
  vendor?: string;
  tags?: string[];
  images?: string[];
  variants?: any;
  inStock?: boolean;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  products?: Product[];
  metadata?: Record<string, any>;
}

export interface Session {
  sessionId: string;
  shopDomain: string;
  customerId?: string;
  currentPage: {
    type: 'home' | 'product' | 'cart' | 'collection' | 'other';
    productId?: string;
  };
  cart?: {
    itemCount: number;
    totalPrice: number;
  };
  metadata?: Record<string, any>;
}

export interface Ticket {
  ticketId: string;
  sessionId: string;
  shopDomain: string;
  customerId?: string;
  customerEmail?: string;
  issueCategory: string;
  issueDescription: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

export interface TryOnResult {
  imageUrl: string;
  category: string;
  categoryType: string;
  generationTimeMs: number;
}

