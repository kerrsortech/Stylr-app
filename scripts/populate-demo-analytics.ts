import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { db } from '../lib/database/db';
import { 
  organizationUsage, 
  tryOnHistory, 
  purchases, 
  sessions, 
  conversations,
  productCatalog,
  organizations
} from '../lib/database/schema';
import { eq, sql } from 'drizzle-orm';

const TEST_SHOP_DOMAIN = 'test-store.myshopify.com';
const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // YYYY-MM

// Generate random number between min and max
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random date within last N days
function randomDate(daysAgo: number): Date {
  const now = new Date();
  const days = randomInt(0, daysAgo);
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(randomInt(9, 21), randomInt(0, 59), randomInt(0, 59));
  return date;
}

async function populateDemoAnalytics() {
  try {
    console.log('🎯 Populating demo analytics data...\n');

    // Get organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.shopDomain, TEST_SHOP_DOMAIN))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    const organizationName = org.organizationName;

    // Get products
    const products = await db
      .select()
      .from(productCatalog)
      .where(eq(productCatalog.shopDomain, TEST_SHOP_DOMAIN))
      .limit(20);

    if (products.length === 0) {
      throw new Error('No products found. Please add products first.');
    }

    console.log(`📦 Found ${products.length} products\n`);

    // 1. Update organization usage with realistic numbers
    console.log('📊 Updating organization usage...');
    const imageGenerationsUsed = randomInt(450, 650); // 450-650 out of 1200
    const chatOutputsUsed = randomInt(1800, 2200); // 1800-2200 out of 4000

    // Check if usage exists for current month
    const [existingUsage] = await db
      .select()
      .from(organizationUsage)
      .where(eq(organizationUsage.shopDomain, TEST_SHOP_DOMAIN))
      .limit(1);

    if (existingUsage) {
      await db
        .update(organizationUsage)
        .set({
          imageGenerationsUsed,
          chatOutputsUsed,
          updatedAt: new Date(),
        })
        .where(eq(organizationUsage.id, existingUsage.id));
      console.log(`   ✅ Updated usage: ${imageGenerationsUsed} image generations, ${chatOutputsUsed} chat outputs`);
    } else {
      await db.insert(organizationUsage).values({
        shopDomain: TEST_SHOP_DOMAIN,
        organizationName,
        month: CURRENT_MONTH,
        imageGenerationsUsed,
        chatOutputsUsed,
        imageGenerationsLimit: 1200,
        chatOutputsLimit: 4000,
        planId: org.planId,
      });
      console.log(`   ✅ Created usage: ${imageGenerationsUsed} image generations, ${chatOutputsUsed} chat outputs`);
    }

    // 2. Create sessions
    console.log('\n👥 Creating user sessions...');
    const sessionIds: string[] = [];
    const numSessions = randomInt(80, 120);
    
    for (let i = 0; i < numSessions; i++) {
      const sessionId = `demo-session-${Date.now()}-${i}`;
      const createdAt = randomDate(30); // Within last 30 days
      const lastActivityAt = new Date(createdAt.getTime() + randomInt(5, 60) * 60000); // 5-60 minutes later
      const customerId = randomInt(1, 10) > 7 ? `customer-${randomInt(1000, 9999)}` : null;
      
      // Use raw SQL to avoid schema mismatch issues
      await db.execute(sql`
        INSERT INTO sessions (session_id, shop_domain, organization_name, customer_id, created_at, last_activity_at, metadata)
        VALUES (${sessionId}, ${TEST_SHOP_DOMAIN}, ${organizationName}, ${customerId}, ${createdAt}, ${lastActivityAt}, '{}'::jsonb)
        ON CONFLICT (session_id) DO NOTHING
      `);
      sessionIds.push(sessionId);
    }
    console.log(`   ✅ Created ${numSessions} sessions`);

    // 3. Create try-on history (most important for dashboard)
    console.log('\n🖼️  Creating try-on history...');
    const tryOnCount = randomInt(180, 250); // Total try-ons
    const productTryOns: Record<string, number> = {}; // Track try-ons per product
    
    // Make some products more popular
    const popularProducts = products.slice(0, Math.min(5, products.length));
    
    for (let i = 0; i < tryOnCount; i++) {
      // 60% chance to use popular products
      const product = Math.random() < 0.6 
        ? popularProducts[randomInt(0, popularProducts.length - 1)]
        : products[randomInt(0, products.length - 1)];
      
      const sessionId = sessionIds[randomInt(0, sessionIds.length - 1)];
      const createdAt = randomDate(30);
      const status = Math.random() < 0.85 ? 'completed' : (Math.random() < 0.5 ? 'processing' : 'failed');
      const generationTimeMs = status === 'completed' ? randomInt(3000, 12000) : null;
      
      await db.insert(tryOnHistory).values({
        sessionId,
        shopDomain: TEST_SHOP_DOMAIN,
        organizationName,
        customerId: null,
        productId: product.productId,
        productCategory: product.category || 'Jackets',
        userPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        productImageUrl: product.images?.[0] || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
        generatedImageUrl: status === 'completed' ? 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500' : null,
        status: status as 'processing' | 'completed' | 'failed',
        errorMessage: status === 'failed' ? 'Generation timeout' : null,
        generationTimeMs,
        metadata: {},
        createdAt,
      });
      
      productTryOns[product.productId] = (productTryOns[product.productId] || 0) + 1;
    }
    console.log(`   ✅ Created ${tryOnCount} try-on events`);
    
    // Find top product
    const topProductId = Object.entries(productTryOns)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    const topProduct = products.find(p => p.productId === topProductId);
    console.log(`   📈 Top product: ${topProduct?.title || 'N/A'} (${productTryOns[topProductId] || 0} try-ons)`);

    // 4. Create purchases (for conversion rate)
    console.log('\n💰 Creating purchases...');
    const purchaseCount = Math.floor(tryOnCount * (randomInt(8, 15) / 100)); // 8-15% conversion rate
    const purchasedProducts = new Set<string>();
    
    for (let i = 0; i < purchaseCount; i++) {
      // Prefer products that were tried on
      const triedOnProducts = Object.keys(productTryOns);
      const product = triedOnProducts.length > 0 && Math.random() < 0.7
        ? products.find(p => p.productId === triedOnProducts[randomInt(0, triedOnProducts.length - 1)])!
        : products[randomInt(0, products.length - 1)];
      
      const sessionId = sessionIds[randomInt(0, sessionIds.length - 1)];
      const createdAt = randomDate(30);
      
      await db.insert(purchases).values({
        shopDomain: TEST_SHOP_DOMAIN,
        organizationName,
        sessionId,
        customerId: null,
        productId: product.productId,
        orderId: `order-${Date.now()}-${i}`,
        quantity: randomInt(1, 2),
        priceCents: product.price,
        currency: 'USD',
        metadata: {},
        createdAt,
      });
      
      purchasedProducts.add(product.productId);
    }
    const conversionRate = ((purchaseCount / tryOnCount) * 100).toFixed(1);
    console.log(`   ✅ Created ${purchaseCount} purchases`);
    console.log(`   📊 Conversion rate: ${conversionRate}%`);

    // 5. Create conversations
    console.log('\n💬 Creating conversations...');
    const conversationCount = randomInt(chatOutputsUsed - 50, chatOutputsUsed);
    
    for (let i = 0; i < conversationCount; i++) {
      const sessionId = sessionIds[randomInt(0, sessionIds.length - 1)];
      const createdAt = randomDate(30);
      
      // User message
      await db.insert(conversations).values({
        sessionId,
        shopDomain: TEST_SHOP_DOMAIN,
        organizationName,
        role: 'user',
        content: [
          'Show me blue jackets',
          'What jackets do you have?',
          'I need a jacket for winter',
          'Do you have leather jackets?',
          'Show me products under $100',
          'What\'s your return policy?',
          'Do you ship internationally?',
        ][randomInt(0, 6)],
        metadata: {},
        timestamp: createdAt,
      });
      
      // Assistant response
      await db.insert(conversations).values({
        sessionId,
        shopDomain: TEST_SHOP_DOMAIN,
        organizationName,
        role: 'assistant',
        content: 'Here are some great options for you...',
        metadata: {
          products: [products[randomInt(0, products.length - 1)].productId],
        },
        timestamp: new Date(createdAt.getTime() + randomInt(1, 5) * 1000),
      });
    }
    console.log(`   ✅ Created ${conversationCount} conversation pairs`);

    console.log('\n✨ Demo analytics data populated successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Sessions: ${numSessions}`);
    console.log(`   - Try-ons: ${tryOnCount}`);
    console.log(`   - Purchases: ${purchaseCount}`);
    console.log(`   - Conversion Rate: ${conversionRate}%`);
    console.log(`   - Image Generations Used: ${imageGenerationsUsed} / 1,200`);
    console.log(`   - Chat Outputs Used: ${chatOutputsUsed} / 4,000`);
    console.log(`   - Top Product: ${topProduct?.title || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Error populating demo analytics:', error);
    throw error;
  }
}

populateDemoAnalytics()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

