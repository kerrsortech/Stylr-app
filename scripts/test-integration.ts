// Integration test script to verify everything works
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { db } from '../lib/database/db';
import { getRedisClient } from '../lib/cache/redis-client';
import { getSession, setSession, addMessage, getConversation } from '../lib/cache/session-manager';
import { getProductCatalog, getShopPolicies } from '../lib/database/queries';
import { canSendChat, getOrganizationByShopDomain } from '../lib/database/organization-queries';
import { GeminiClient } from '../lib/ai/gemini-client';
import { analyzeIntent } from '../lib/chatbot/intent-detector';

const TEST_SHOP_DOMAIN = 'test-store.myshopify.com';
const TEST_SESSION_ID = `test_${Date.now()}`;

async function testIntegration() {
  console.log('🧪 Starting Integration Tests...\n');
  const errors: string[] = [];
  const successes: string[] = [];

  // Test 1: Database Connection
  console.log('1️⃣ Testing Database Connection...');
  try {
    const org = await getOrganizationByShopDomain(TEST_SHOP_DOMAIN);
    if (org) {
      console.log('   ✅ Database connection: OK');
      console.log(`   ✅ Test organization found: ${org.organizationName}`);
      successes.push('Database connection');
    } else {
      errors.push('Test organization not found');
      console.log('   ❌ Test organization not found');
    }
  } catch (error: any) {
    errors.push(`Database error: ${error.message}`);
    console.log(`   ❌ Database error: ${error.message}`);
  }

  // Test 2: Redis Connection
  console.log('\n2️⃣ Testing Redis Connection...');
  try {
    const redis = await getRedisClient();
    await redis.ping();
    console.log('   ✅ Redis connection: OK');
    successes.push('Redis connection');
  } catch (error: any) {
    errors.push(`Redis error: ${error.message}`);
    console.log(`   ❌ Redis error: ${error.message}`);
  }

  // Test 3: Session Management
  console.log('\n3️⃣ Testing Session Management...');
  try {
    const testSession = {
      sessionId: TEST_SESSION_ID,
      shopDomain: TEST_SHOP_DOMAIN,
      customerId: null,
      currentPage: { type: 'product' as const, productId: 'prod-123' },
      cart: { itemCount: 0, totalPrice: 0 },
      metadata: {},
    };
    await setSession(testSession);
    const retrieved = await getSession(TEST_SESSION_ID);
    if (retrieved && retrieved.sessionId === TEST_SESSION_ID) {
      console.log('   ✅ Session management: OK');
      successes.push('Session management');
    } else {
      errors.push('Session retrieval failed');
      console.log('   ❌ Session retrieval failed');
    }
  } catch (error: any) {
    errors.push(`Session error: ${error.message}`);
    console.log(`   ❌ Session error: ${error.message}`);
  }

  // Test 4: Conversation History
  console.log('\n4️⃣ Testing Conversation History...');
  try {
    await addMessage(TEST_SESSION_ID, {
      role: 'user',
      content: 'Test message',
      timestamp: Date.now(),
    });
    const messages = await getConversation(TEST_SESSION_ID);
    if (messages.length > 0 && messages[0].content === 'Test message') {
      console.log('   ✅ Conversation history: OK');
      successes.push('Conversation history');
    } else {
      errors.push('Conversation history failed');
      console.log('   ❌ Conversation history failed');
    }
  } catch (error: any) {
    errors.push(`Conversation error: ${error.message}`);
    console.log(`   ❌ Conversation error: ${error.message}`);
  }

  // Test 5: Product Catalog
  console.log('\n5️⃣ Testing Product Catalog...');
  try {
    const products = await getProductCatalog(TEST_SHOP_DOMAIN);
    console.log(`   ✅ Product catalog: OK (${products.length} products)`);
    successes.push('Product catalog');
  } catch (error: any) {
    errors.push(`Product catalog error: ${error.message}`);
    console.log(`   ❌ Product catalog error: ${error.message}`);
  }

  // Test 6: Shop Policies
  console.log('\n6️⃣ Testing Shop Policies...');
  try {
    const policies = await getShopPolicies(TEST_SHOP_DOMAIN);
    console.log('   ✅ Shop policies: OK');
    successes.push('Shop policies');
  } catch (error: any) {
    errors.push(`Shop policies error: ${error.message}`);
    console.log(`   ❌ Shop policies error: ${error.message}`);
  }

  // Test 7: Organization Usage
  console.log('\n7️⃣ Testing Organization Usage...');
  try {
    const canChat = await canSendChat(TEST_SHOP_DOMAIN);
    console.log(`   ✅ Organization usage check: OK (can chat: ${canChat})`);
    successes.push('Organization usage');
  } catch (error: any) {
    errors.push(`Organization usage error: ${error.message}`);
    console.log(`   ❌ Organization usage error: ${error.message}`);
  }

  // Test 8: Gemini API
  console.log('\n8️⃣ Testing Gemini API...');
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not set');
    }
    const gemini = new GeminiClient(process.env.GOOGLE_GEMINI_API_KEY);
    const testResponse = await gemini.generateText('Say "OK" if you can read this.', {
      temperature: 0.1,
      maxTokens: 10,
    });
    if (testResponse && testResponse.length > 0) {
      console.log('   ✅ Gemini API: OK');
      successes.push('Gemini API');
    } else {
      errors.push('Gemini API returned empty response');
      console.log('   ❌ Gemini API returned empty response');
    }
  } catch (error: any) {
    errors.push(`Gemini API error: ${error.message}`);
    console.log(`   ❌ Gemini API error: ${error.message}`);
  }

  // Test 9: Intent Detection
  console.log('\n9️⃣ Testing Intent Detection...');
  try {
    const intent = await analyzeIntent('Show me blue jackets under $100', null, []);
    if (intent && intent.type) {
      console.log(`   ✅ Intent detection: OK (detected: ${intent.type})`);
      successes.push('Intent detection');
    } else {
      errors.push('Intent detection failed');
      console.log('   ❌ Intent detection failed');
    }
  } catch (error: any) {
    errors.push(`Intent detection error: ${error.message}`);
    console.log(`   ❌ Intent detection error: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Integration Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${successes.length}`);
  console.log(`❌ Failed: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(`   - ${error}`));
  }

  if (successes.length === 9) {
    console.log('\n🎉 All integration tests passed!');
    console.log('\n✅ Your system is ready for testing:');
    console.log('   1. Start the dev server: npm run dev');
    console.log('   2. Visit: http://localhost:3000/demo');
    console.log('   3. Test the chat widget');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the errors above.');
    return false;
  }
}

testIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

