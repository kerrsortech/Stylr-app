import { db } from './db';
import { productCatalog, shopPolicies, conversations as conversationsTable, policyFiles, brandGuidelines, tryOnHistory, purchases, organizations, sessions } from './schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { getAllProducts } from '@/lib/integrations/catalog-fetcher';
import { readFileFromS3Url } from '@/lib/storage/s3-storage';
import { getOrganizationByShopDomain } from './organization-queries';
import { dataCache, getCatalogCacheKey, getPoliciesCacheKey, getBrandGuidelinesCacheKey } from '@/lib/cache/data-cache';

/**
 * Get product catalog for a shop
 * Now fetches dynamically from catalog sources instead of database
 * Falls back to database if no sources are configured
 * Uses cache to speed up subsequent requests
 */
export async function getProductCatalog(shopDomain: string): Promise<any[]> {
  const cacheKey = getCatalogCacheKey(shopDomain);
  
  // Check cache first
  const cached = dataCache.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Try to fetch from catalog sources first
    try {
      const products = await getAllProducts(shopDomain);
      if (products.length > 0) {
        const mapped = products.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          category: p.category,
          type: p.type,
          vendor: p.vendor,
          tags: p.tags || [],
          images: p.images || [],
          image: p.images?.[0] || null, // First image as main image
          imageUrl: p.images?.[0] || null, // For compatibility
          thumbnail: p.images?.[0] || null, // Thumbnail
          variants: p.variants,
          inStock: p.inStock !== false,
          metadata: p.metadata,
        }));
        // Cache the result
        dataCache.set(cacheKey, mapped);
        return mapped;
      }
    } catch (error) {
      logger.warn('Failed to fetch from catalog sources, falling back to database', { error });
    }

    // Fallback to database (for backward compatibility)
    const products = await db
      .select()
      .from(productCatalog)
      .where(eq(productCatalog.shopDomain, shopDomain));

    const mapped = products.map(p => ({
      id: p.productId,
      title: p.title,
      description: p.description,
      price: p.price,
      category: p.category,
      type: p.type,
      vendor: p.vendor,
      tags: p.tags || [],
      images: p.images || [],
      image: p.images?.[0] || null, // First image as main image
      imageUrl: p.images?.[0] || null, // For compatibility
      thumbnail: p.images?.[0] || null, // Thumbnail
      variants: p.variants,
      inStock: p.inStock !== false,
      metadata: p.metadata,
    }));
    
    // Cache the result
    dataCache.set(cacheKey, mapped);
    return mapped;
  } catch (error) {
    logger.error('Failed to fetch product catalog', error);
    return [];
  }
}

/**
 * Get shop policies (including uploaded policy files)
 * Uses cache to speed up subsequent requests
 */
export async function getShopPolicies(shopDomain: string): Promise<any> {
  const cacheKey = getPoliciesCacheKey(shopDomain);
  
  // Check cache first
  const cached = dataCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get text-based policies
    const [policy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopDomain, shopDomain))
      .limit(1);

    // Get uploaded policy files
    const policyFilesList = await db
      .select()
      .from(policyFiles)
      .where(eq(policyFiles.shopDomain, shopDomain));

    // Read file contents from S3
    const policyContents: Record<string, string> = {};
    for (const file of policyFilesList) {
      try {
        const content = await readFileFromS3Url(file.fileUrl);
        policyContents[file.policyType] = content;
      } catch (error) {
        logger.warn(`Failed to read policy file ${file.fileName}`, { error });
      }
    }

    const result = {
      ...(policy || {
        shippingPolicy: null,
        returnPolicy: null,
        privacyPolicy: null,
        termsOfService: null,
        customPolicies: null,
      }),
      // Override with file contents if available
      shippingPolicy: policyContents['shipping'] || policy?.shippingPolicy || null,
      returnPolicy: policyContents['return'] || policy?.returnPolicy || null,
      refundPolicy: policyContents['refund'] || null,
      privacyPolicy: policyContents['privacy'] || policy?.privacyPolicy || null,
      termsOfService: policyContents['terms'] || policy?.termsOfService || null,
      customPolicies: policyContents['custom'] || policy?.customPolicies || null,
    };
    
    // Cache the result (30 minutes TTL)
    dataCache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch (error) {
    logger.error('Failed to fetch shop policies', error);
    const fallback = {
      shippingPolicy: null,
      returnPolicy: null,
      refundPolicy: null,
      privacyPolicy: null,
      termsOfService: null,
      customPolicies: null,
    };
    // Cache fallback too to avoid repeated failures
    dataCache.set(cacheKey, fallback, 5 * 60 * 1000);
    return fallback;
  }
}

/**
 * Get brand guidelines
 * Uses cache to speed up subsequent requests
 */
export async function getBrandGuidelines(shopDomain: string): Promise<any> {
  const cacheKey = getBrandGuidelinesCacheKey(shopDomain);
  
  // Check cache first
  const cached = dataCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const [guidelines] = await db
      .select()
      .from(brandGuidelines)
      .where(eq(brandGuidelines.shopDomain, shopDomain))
      .limit(1);

    if (!guidelines) {
      const fallback = {
        aboutBrand: null,
        brandGuidelines: null,
      };
      dataCache.set(cacheKey, fallback, 30 * 60 * 1000);
      return fallback;
    }

    // Read file contents from S3 if available
    let brandGuidelinesContent = null;
    let aboutBrandContent = guidelines.aboutBrand || null;

    if (guidelines.brandGuidelinesUrl) {
      try {
        brandGuidelinesContent = await readFileFromS3Url(guidelines.brandGuidelinesUrl);
      } catch (error) {
        logger.warn('Failed to read brand guidelines file', { error });
      }
    }

    if (guidelines.aboutBrandUrl) {
      try {
        aboutBrandContent = await readFileFromS3Url(guidelines.aboutBrandUrl);
      } catch (error) {
        logger.warn('Failed to read about brand file', { error });
      }
    }

    const result = {
      aboutBrand: aboutBrandContent,
      brandGuidelines: brandGuidelinesContent,
    };
    
    // Cache the result (30 minutes TTL)
    dataCache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch (error) {
    logger.error('Failed to fetch brand guidelines', error);
    return {
      aboutBrand: null,
      brandGuidelines: null,
    };
  }
}

/**
 * Save conversation to database
 */
export async function saveConversation(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: any
): Promise<void> {
  try {
    // Get shopDomain and organizationName from session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);

    if (!session) {
      logger.warn('Session not found for conversation', { sessionId });
      return;
    }

    // Get organizationName from organizations table
    const org = await getOrganizationByShopDomain(session.shopDomain);
    const organizationName = org?.organizationName || '';

    // Get customerId from session for privacy - chat history is linked to user ID
    const customerId = session.customerId || null;

    await db.insert(conversationsTable).values({
      sessionId,
      shopDomain: session.shopDomain,
      organizationName,
      customerId, // Link conversation to user ID for privacy
      role,
      content,
      metadata: metadata || {},
    });
  } catch (error) {
    logger.error('Failed to save conversation', error);
    // Don't throw - conversation saving is not critical
  }
}

/**
 * Get conversations by customerId (for privacy - only user's own conversations)
 * This ensures chat history is only visible to the user who created it
 */
export async function getConversationsByCustomerId(
  customerId: string,
  shopDomain?: string
): Promise<any[]> {
  try {
    const conditions = shopDomain
      ? and(
          eq(conversationsTable.customerId, customerId),
          eq(conversationsTable.shopDomain, shopDomain)
        )
      : eq(conversationsTable.customerId, customerId);

    const conversations = await db
      .select()
      .from(conversationsTable)
      .where(conditions)
      .orderBy(desc(conversationsTable.timestamp));

    return conversations;
  } catch (error) {
    logger.error('Failed to get conversations by customerId', error);
    return [];
  }
}

/**
 * Get user photos by customerId or customerEmail (for privacy - only user's own photos)
 * Returns the most recent session's photos for the user
 */
export async function getUserPhotos(
  customerId?: string,
  customerEmail?: string,
  shopDomain?: string
): Promise<{
  standingPhotoUrl: string | null;
  portraitPhotoUrl: string | null;
  userPhotoUrl: string | null;
} | null> {
  try {
    if (!customerId && !customerEmail) {
      return null;
    }

    const conditions = [];
    if (customerId) {
      conditions.push(eq(sessions.customerId, customerId));
    }
    if (customerEmail) {
      conditions.push(eq(sessions.customerEmail, customerEmail));
    }
    if (shopDomain) {
      conditions.push(eq(sessions.shopDomain, shopDomain));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get the most recent session with photos
    const [session] = await db
      .select({
        standingPhotoUrl: sessions.standingPhotoUrl,
        portraitPhotoUrl: sessions.portraitPhotoUrl,
        userPhotoUrl: sessions.userPhotoUrl,
      })
      .from(sessions)
      .where(whereClause)
      .orderBy(desc(sessions.lastActivityAt))
      .limit(1);

    if (!session) {
      return null;
    }

    return {
      standingPhotoUrl: session.standingPhotoUrl || null,
      portraitPhotoUrl: session.portraitPhotoUrl || null,
      userPhotoUrl: session.userPhotoUrl || null,
    };
  } catch (error) {
    logger.error('Failed to get user photos', error);
    return null;
  }
}

/**
 * Save try-on history to database
 */
export async function saveTryOnHistory(data: {
  sessionId: string;
  shopDomain: string;
  customerId?: string | null;
  productId: string;
  productCategory: string;
  userPhotoUrl: string;
  productImageUrl: string;
  generatedImageUrl?: string | null;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string | null;
  generationTimeMs?: number | null;
  metadata?: any;
}): Promise<void> {
  try {
    // Get organizationName from organizations table
    const org = await getOrganizationByShopDomain(data.shopDomain);
    const organizationName = org?.organizationName || '';

    await db.insert(tryOnHistory).values({
      sessionId: data.sessionId,
      shopDomain: data.shopDomain,
      organizationName,
      customerId: data.customerId || null,
      productId: data.productId,
      productCategory: data.productCategory,
      userPhotoUrl: data.userPhotoUrl,
      productImageUrl: data.productImageUrl,
      generatedImageUrl: data.generatedImageUrl || null,
      status: data.status,
      errorMessage: data.errorMessage || null,
      generationTimeMs: data.generationTimeMs || null,
      metadata: data.metadata || {},
    });
  } catch (error) {
    logger.error('Failed to save try-on history', error);
    // Don't throw - try-on history saving is not critical for the API response
  }
}

/**
 * Track a product purchase for conversion rate calculation
 */
export async function trackPurchase(data: {
  shopDomain: string;
  productId: string;
  sessionId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  quantity?: number;
  priceCents: number;
  currency?: string;
  metadata?: any;
}): Promise<void> {
  try {
    // Get organizationName from organizations table
    const org = await getOrganizationByShopDomain(data.shopDomain);
    const organizationName = org?.organizationName || '';

    await db.insert(purchases).values({
      shopDomain: data.shopDomain,
      organizationName,
      productId: data.productId,
      sessionId: data.sessionId || null,
      customerId: data.customerId || null,
      orderId: data.orderId || null,
      quantity: data.quantity || 1,
      priceCents: data.priceCents,
      currency: data.currency || 'USD',
      metadata: data.metadata || {},
    });
  } catch (error) {
    logger.error('Failed to track purchase', error);
    // Don't throw - purchase tracking is not critical for the API response
  }
}

