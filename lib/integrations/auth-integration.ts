import { db } from '@/lib/database/db';
import { authIntegrations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

export interface UserDetails {
  id: string;
  email: string;
  name?: string;
  [key: string]: any; // Additional user properties
}

export interface OrderItem {
  productId: string;
  variantId?: string; // For platforms like Shopify that use variant IDs
  productName?: string;
  quantity: number;
  priceCents?: number;
  [key: string]: any; // Additional order item properties
}

export interface Order {
  orderId: string;
  customerId: string;
  customerEmail: string;
  status: string; // 'completed', 'pending', 'cancelled', etc.
  items: OrderItem[];
  totalCents?: number;
  createdAt: string | Date;
  [key: string]: any; // Additional order properties
}

export interface OrderHistory {
  orders: Order[];
  totalOrders: number;
}

export interface AuthIntegrationConfig {
  shopify?: {
    shopDomain: string;
    accessToken: string;
  };
  woocommerce?: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
  };
  custom?: {
    apiUrl: string;
    apiKey?: string;
    headers?: Record<string, string>;
    getUserEndpoint?: string; // Default: /api/user
    getOrderHistoryEndpoint?: string; // Default: /api/orders
  };
  none?: {}; // No authentication
}

/**
 * Get authentication integration for a shop
 */
export async function getAuthIntegration(shopDomain: string) {
  try {
    const [integration] = await db
      .select()
      .from(authIntegrations)
      .where(
        and(
          eq(authIntegrations.shopDomain, shopDomain),
          eq(authIntegrations.enabled, true)
        )
      )
      .limit(1);

    return integration || null;
  } catch (error) {
    logger.error('Failed to get auth integration', error);
    return null;
  }
}

/**
 * Fetch user details from authentication platform
 */
export async function fetchUserDetails(
  shopDomain: string,
  customerId?: string,
  customerEmail?: string
): Promise<UserDetails | null> {
  try {
    const integration = await getAuthIntegration(shopDomain);
    
    if (!integration || integration.authPlatform === 'none') {
      // No auth integration, return basic info
      if (customerId || customerEmail) {
        return {
          id: customerId || 'unknown',
          email: customerEmail || 'unknown',
          name: undefined,
        };
      }
      return null;
    }

    const config = integration.config as AuthIntegrationConfig;

    switch (integration.authPlatform) {
      case 'shopify':
        return await fetchShopifyUser(config.shopify!, customerId, customerEmail);
      
      case 'woocommerce':
        return await fetchWooCommerceUser(config.woocommerce!, customerId, customerEmail);
      
      case 'custom':
        return await fetchCustomUser(config.custom!, customerId, customerEmail);
      
      default:
        logger.warn('Unknown auth platform', { platform: integration.authPlatform });
        return null;
    }
  } catch (error) {
    logger.error('Failed to fetch user details', error);
    return null;
  }
}

/**
 * Fetch user details from Shopify
 */
async function fetchShopifyUser(
  config: NonNullable<AuthIntegrationConfig['shopify']>,
  customerId?: string,
  customerEmail?: string
): Promise<UserDetails | null> {
  try {
    if (!customerId && !customerEmail) {
      return null;
    }

    const shopDomain = config.shopDomain;
    const accessToken = config.accessToken;
    
    // Try to fetch by ID first, then by email
    let customer: any = null;
    
    if (customerId) {
      try {
        const response = await fetch(
          `https://${shopDomain}/admin/api/2024-01/customers/${customerId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          customer = data.customer;
        }
      } catch (error) {
        logger.warn('Failed to fetch Shopify customer by ID', { error });
      }
    }
    
    // If not found by ID, try by email
    if (!customer && customerEmail) {
      try {
        const response = await fetch(
          `https://${shopDomain}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(customerEmail)}`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.customers && data.customers.length > 0) {
            customer = data.customers[0];
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch Shopify customer by email', { error });
      }
    }
    
    if (customer) {
      return {
        id: String(customer.id),
        email: customer.email || customerEmail || '',
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || undefined,
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to fetch Shopify user', error);
    return null;
  }
}

/**
 * Fetch user details from WooCommerce
 */
async function fetchWooCommerceUser(
  config: NonNullable<AuthIntegrationConfig['woocommerce']>,
  customerId?: string,
  customerEmail?: string
): Promise<UserDetails | null> {
  try {
    if (!customerId && !customerEmail) {
      return null;
    }

    const baseUrl = config.url.replace(/\/$/, '');
    const consumerKey = config.consumerKey;
    const consumerSecret = config.consumerSecret;
    
    let customer: any = null;
    
    // Try to fetch by ID first
    if (customerId) {
      try {
        const response = await fetch(
          `${baseUrl}/wp-json/wc/v3/customers/${customerId}`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          customer = await response.json();
        }
      } catch (error) {
        logger.warn('Failed to fetch WooCommerce customer by ID', { error });
      }
    }
    
    // If not found by ID, try by email
    if (!customer && customerEmail) {
      try {
        const response = await fetch(
          `${baseUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(customerEmail)}`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            customer = data[0];
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch WooCommerce customer by email', { error });
      }
    }
    
    if (customer) {
      return {
        id: String(customer.id),
        email: customer.email || customerEmail || '',
        name: customer.first_name || customer.last_name 
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : undefined,
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to fetch WooCommerce user', error);
    return null;
  }
}

/**
 * Fetch user details from custom API
 */
async function fetchCustomUser(
  config: NonNullable<AuthIntegrationConfig['custom']>,
  customerId?: string,
  customerEmail?: string
): Promise<UserDetails | null> {
  try {
    if (!customerId && !customerEmail) {
      return null;
    }

    const apiUrl = config.apiUrl.replace(/\/$/, '');
    const endpoint = config.getUserEndpoint || '/api/user';
    const apiKey = config.apiKey;
    const headers = config.headers || {};
    
    // Build request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    
    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Try to fetch by ID first, then by email
    let user: any = null;
    
    if (customerId) {
      try {
        const response = await fetch(
          `${apiUrl}${endpoint}?id=${encodeURIComponent(customerId)}`,
          {
            headers: requestHeaders,
          }
        );
        
        if (response.ok) {
          user = await response.json();
        }
      } catch (error) {
        logger.warn('Failed to fetch custom user by ID', { error });
      }
    }
    
    // If not found by ID, try by email
    if (!user && customerEmail) {
      try {
        const response = await fetch(
          `${apiUrl}${endpoint}?email=${encodeURIComponent(customerEmail)}`,
          {
            headers: requestHeaders,
          }
        );
        
        if (response.ok) {
          user = await response.json();
        }
      } catch (error) {
        logger.warn('Failed to fetch custom user by email', { error });
      }
    }
    
    if (user) {
      return {
        id: user.id || customerId || 'unknown',
        email: user.email || customerEmail || '',
        name: user.name || user.displayName || user.fullName || undefined,
        ...user, // Include any additional properties
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to fetch custom user', error);
    return null;
  }
}

/**
 * Fetch user order history from authentication platform
 */
export async function fetchUserOrderHistory(
  shopDomain: string,
  customerId?: string,
  customerEmail?: string
): Promise<OrderHistory | null> {
  try {
    const integration = await getAuthIntegration(shopDomain);
    
    if (!integration || integration.authPlatform === 'none') {
      return null;
    }

    const config = integration.config as AuthIntegrationConfig;

    switch (integration.authPlatform) {
      case 'shopify':
        return await fetchShopifyOrderHistory(config.shopify!, customerId, customerEmail);
      
      case 'woocommerce':
        return await fetchWooCommerceOrderHistory(config.woocommerce!, customerId, customerEmail);
      
      case 'custom':
        return await fetchCustomOrderHistory(config.custom!, customerId, customerEmail);
      
      default:
        logger.warn('Unknown auth platform for order history', { platform: integration.authPlatform });
        return null;
    }
  } catch (error) {
    logger.error('Failed to fetch user order history', error);
    return null;
  }
}

/**
 * Fetch order history from Shopify
 */
async function fetchShopifyOrderHistory(
  config: NonNullable<AuthIntegrationConfig['shopify']>,
  customerId?: string,
  customerEmail?: string
): Promise<OrderHistory | null> {
  try {
    if (!customerId && !customerEmail) {
      return null;
    }

    const shopDomain = config.shopDomain;
    const accessToken = config.accessToken;
    
    // First, get the customer ID if we only have email
    let shopifyCustomerId = customerId;
    
    if (!shopifyCustomerId && customerEmail) {
      try {
        const response = await fetch(
          `https://${shopDomain}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(customerEmail)}`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.customers && data.customers.length > 0) {
            shopifyCustomerId = String(data.customers[0].id);
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch Shopify customer by email for orders', { error });
      }
    }
    
    if (!shopifyCustomerId) {
      return null;
    }
    
    // Fetch orders for this customer
    const orders: Order[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    
    while (hasNextPage) {
      try {
        let url = `https://${shopDomain}/admin/api/2024-01/customers/${shopifyCustomerId}/orders.json?status=any&limit=250`;
        if (cursor) {
          url += `&since_id=${cursor}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const shopifyOrders = data.orders || [];
          
          for (const order of shopifyOrders) {
            const items: OrderItem[] = (order.line_items || []).map((item: any) => ({
              // Use product_id as primary, fallback to variant_id for better matching
              // Store both for flexible matching across platforms
              productId: String(item.product_id || item.variant_id || ''),
              variantId: item.variant_id ? String(item.variant_id) : undefined,
              productName: item.name,
              quantity: item.quantity || 1,
              priceCents: item.price ? Math.round(parseFloat(item.price) * 100) : undefined,
            }));
            
            orders.push({
              orderId: String(order.id),
              customerId: String(order.customer?.id || shopifyCustomerId),
              customerEmail: order.email || customerEmail || '',
              status: order.financial_status === 'paid' ? 'completed' : order.financial_status || 'pending',
              items,
              totalCents: order.total_price ? Math.round(parseFloat(order.total_price) * 100) : undefined,
              createdAt: order.created_at || new Date().toISOString(),
            });
          }
          
          // Check if there are more pages
          hasNextPage = shopifyOrders.length === 250;
          if (hasNextPage && shopifyOrders.length > 0) {
            cursor = String(shopifyOrders[shopifyOrders.length - 1].id);
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      } catch (error) {
        logger.warn('Failed to fetch Shopify orders', { error });
        hasNextPage = false;
      }
    }
    
    return {
      orders,
      totalOrders: orders.length,
    };
  } catch (error) {
    logger.error('Failed to fetch Shopify order history', error);
    return null;
  }
}

/**
 * Fetch order history from WooCommerce
 */
async function fetchWooCommerceOrderHistory(
  config: NonNullable<AuthIntegrationConfig['woocommerce']>,
  customerId?: string,
  customerEmail?: string
): Promise<OrderHistory | null> {
  try {
    if (!customerId && !customerEmail) {
      return null;
    }

    const baseUrl = config.url.replace(/\/$/, '');
    const consumerKey = config.consumerKey;
    const consumerSecret = config.consumerSecret;
    
    // First, get the customer ID if we only have email
    let wcCustomerId = customerId;
    
    if (!wcCustomerId && customerEmail) {
      try {
        const response = await fetch(
          `${baseUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(customerEmail)}`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            wcCustomerId = String(data[0].id);
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch WooCommerce customer by email for orders', { error });
      }
    }
    
    if (!wcCustomerId) {
      return null;
    }
    
    // Fetch orders for this customer
    const orders: Order[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await fetch(
          `${baseUrl}/wp-json/wc/v3/orders?customer=${wcCustomerId}&page=${page}&per_page=100`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const wcOrders = await response.json();
          
          for (const order of wcOrders) {
            const items: OrderItem[] = (order.line_items || []).map((item: any) => ({
              productId: String(item.product_id || item.id || ''),
              productName: item.name,
              quantity: item.quantity || 1,
              priceCents: item.price ? Math.round(parseFloat(item.price) * 100) : undefined,
            }));
            
            orders.push({
              orderId: String(order.id),
              customerId: String(order.customer_id || wcCustomerId),
              customerEmail: order.billing?.email || customerEmail || '',
              status: order.status === 'completed' ? 'completed' : order.status || 'pending',
              items,
              totalCents: order.total ? Math.round(parseFloat(order.total) * 100) : undefined,
              createdAt: order.date_created || new Date().toISOString(),
            });
          }
          
          hasMore = wcOrders.length === 100;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        logger.warn('Failed to fetch WooCommerce orders', { error });
        hasMore = false;
      }
    }
    
    return {
      orders,
      totalOrders: orders.length,
    };
  } catch (error) {
    logger.error('Failed to fetch WooCommerce order history', error);
    return null;
  }
}

/**
 * Fetch order history from custom API
 */
async function fetchCustomOrderHistory(
  config: NonNullable<AuthIntegrationConfig['custom']>,
  customerId?: string,
  customerEmail?: string
): Promise<OrderHistory | null> {
  try {
    if (!customerId && !customerEmail) {
      return null;
    }

    const apiUrl = config.apiUrl.replace(/\/$/, '');
    const endpoint = config.getOrderHistoryEndpoint || '/api/orders';
    const apiKey = config.apiKey;
    const headers = config.headers || {};
    
    // Build request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    
    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if (customerId) params.append('customerId', customerId);
    if (customerEmail) params.append('customerEmail', customerEmail);
    
    try {
      const response = await fetch(
        `${apiUrl}${endpoint}?${params.toString()}`,
        {
          headers: requestHeaders,
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
          // If response is array of orders, convert to our format
          const orders: Order[] = data.map((order: any) => ({
            orderId: String(order.orderId || order.id || ''),
            customerId: String(order.customerId || customerId || ''),
            customerEmail: order.customerEmail || order.email || customerEmail || '',
            status: order.status || 'completed',
            items: (order.items || []).map((item: any) => ({
              productId: String(item.productId || item.id || ''),
              productName: item.productName || item.name,
              quantity: item.quantity || 1,
              priceCents: item.priceCents || (item.price ? Math.round(parseFloat(item.price) * 100) : undefined),
            })),
            totalCents: order.totalCents || (order.total ? Math.round(parseFloat(order.total) * 100) : undefined),
            createdAt: order.createdAt || order.created_at || new Date().toISOString(),
          }));
          
          return {
            orders,
            totalOrders: orders.length,
          };
        } else if (data.orders && Array.isArray(data.orders)) {
          // If response has orders array
          return {
            orders: data.orders,
            totalOrders: data.totalOrders || data.orders.length,
          };
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch custom order history', { error });
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to fetch custom order history', error);
    return null;
  }
}

