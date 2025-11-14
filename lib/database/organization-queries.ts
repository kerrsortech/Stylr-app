import { db } from './db';
import { organizations, organizationUsage, plans } from './schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { getPlanById } from '@/lib/config/plans';

/**
 * Get organization by shop domain
 */
export async function getOrganizationByShopDomain(shopDomain: string) {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.shopDomain, shopDomain))
      .limit(1);

    return org || null;
  } catch (error) {
    logger.error('Failed to fetch organization', error);
    return null;
  }
}

/**
 * Get organization by admin email
 */
export async function getOrganizationByAdminEmail(adminEmail: string) {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.adminEmail, adminEmail))
      .limit(1);

    return org || null;
  } catch (error: any) {
    logger.error('Failed to fetch organization by email', { error, adminEmail });
    // Re-throw database connection errors so they can be handled properly
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.message?.includes('connection')) {
      throw new Error('Database connection failed. Please check your DATABASE_URL environment variable.');
    }
    return null;
  }
}

/**
 * Get current month usage for organization
 */
export async function getCurrentMonthUsage(shopDomain: string) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [usage] = await db
      .select()
      .from(organizationUsage)
      .where(
        and(
          eq(organizationUsage.shopDomain, shopDomain),
          eq(organizationUsage.month, currentMonth)
        )
      )
      .limit(1);

    return usage || null;
  } catch (error) {
    logger.error('Failed to fetch current month usage', error);
    return null;
  }
}

/**
 * Get or create current month usage
 */
export async function getOrCreateCurrentMonthUsage(shopDomain: string) {
  const org = await getOrganizationByShopDomain(shopDomain);
  if (!org) {
    throw new Error('Organization not found');
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  let usage = await getCurrentMonthUsage(shopDomain);

  if (!usage) {
    // Get plan limits
    const plan = getPlanById(org.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Create new usage record
    const [newUsage] = await db
      .insert(organizationUsage)
      .values({
        shopDomain,
        organizationName: org.organizationName,
        month: currentMonth,
        imageGenerationsUsed: 0,
        chatOutputsUsed: 0,
        imageGenerationsLimit: plan.imageGenerationsLimit,
        chatOutputsLimit: plan.chatOutputsLimit,
        planId: org.planId,
      })
      .returning();

    usage = newUsage;
  }

  return usage;
}

/**
 * Increment image generation usage
 */
export async function incrementImageGenerationUsage(shopDomain: string): Promise<boolean> {
  try {
    const usage = await getOrCreateCurrentMonthUsage(shopDomain);

    // Check if limit exceeded
    if ((usage.imageGenerationsUsed ?? 0) >= usage.imageGenerationsLimit) {
      return false; // Limit exceeded
    }

    // Increment usage
    await db
      .update(organizationUsage)
      .set({
        imageGenerationsUsed: (usage.imageGenerationsUsed ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(organizationUsage.id, usage.id));

    return true; // Success
  } catch (error) {
    logger.error('Failed to increment image generation usage', error);
    return false;
  }
}

/**
 * Increment chat output usage
 */
export async function incrementChatOutputUsage(shopDomain: string): Promise<boolean> {
  try {
    const usage = await getOrCreateCurrentMonthUsage(shopDomain);

    // Check if limit exceeded
    if ((usage.chatOutputsUsed ?? 0) >= usage.chatOutputsLimit) {
      return false; // Limit exceeded
    }

    // Increment usage
    await db
      .update(organizationUsage)
      .set({
        chatOutputsUsed: (usage.chatOutputsUsed ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(organizationUsage.id, usage.id));

    return true; // Success
  } catch (error) {
    logger.error('Failed to increment chat output usage', error);
    return false;
  }
}

/**
 * Check if organization can generate image
 */
export async function canGenerateImage(shopDomain: string): Promise<boolean> {
  const usage = await getOrCreateCurrentMonthUsage(shopDomain);
  return (usage.imageGenerationsUsed ?? 0) < usage.imageGenerationsLimit;
}

/**
 * Check if organization can send chat
 */
export async function canSendChat(shopDomain: string): Promise<boolean> {
  const usage = await getOrCreateCurrentMonthUsage(shopDomain);
  return (usage.chatOutputsUsed ?? 0) < usage.chatOutputsLimit;
}

/**
 * Get organization stats
 */
export async function getOrganizationStats(shopDomain: string) {
  const org = await getOrganizationByShopDomain(shopDomain);
  if (!org) {
    return null;
  }

  const usage = await getOrCreateCurrentMonthUsage(shopDomain);
  const plan = getPlanById(org.planId);

  return {
    organization: org,
    plan: plan,
    usage: {
      imageGenerationsUsed: usage.imageGenerationsUsed ?? 0,
      imageGenerationsLimit: usage.imageGenerationsLimit,
      imageGenerationsRemaining: usage.imageGenerationsLimit - (usage.imageGenerationsUsed ?? 0),
      chatOutputsUsed: usage.chatOutputsUsed ?? 0,
      chatOutputsLimit: usage.chatOutputsLimit,
      chatOutputsRemaining: usage.chatOutputsLimit - (usage.chatOutputsUsed ?? 0),
      month: usage.month,
    },
  };
}

