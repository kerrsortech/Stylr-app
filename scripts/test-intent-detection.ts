/**
 * Test script for intent detection
 * Run with: npx tsx scripts/test-intent-detection.ts
 */

import { analyzeIntent } from '@/lib/chatbot/intent-detector';

const testCases = [
  {
    message: 'hi',
    expectedType: 'question',
    description: 'Simple greeting',
  },
  {
    message: 'hello',
    expectedType: 'question',
    description: 'Another greeting',
  },
  {
    message: 'Tell me more about this product',
    expectedType: 'question',
    description: 'Current product question',
    currentProduct: { id: '1', title: 'Test Product', price: 5000 },
  },
  {
    message: 'Do you have blue jackets?',
    expectedType: 'search',
    description: 'Product search with color',
  },
  {
    message: 'Show me shoes under $100',
    expectedType: 'search',
    description: 'Product search with price filter',
  },
  {
    message: 'Recommend matching items',
    expectedType: 'recommendation',
    description: 'Recommendation request',
  },
  {
    message: 'I need support',
    expectedType: 'ticket_creation',
    description: 'Ticket creation',
  },
  {
    message: 'What is your return policy?',
    expectedType: 'policy_query',
    description: 'Policy question',
  },
  {
    message: 'recommend me products',
    expectedType: 'recommendation',
    description: 'Product recommendation',
  },
  {
    message: 'create a ticket',
    expectedType: 'ticket_creation',
    description: 'Direct ticket creation',
  },
];

async function runTests() {
  console.log('🧪 Testing Intent Detection (Backend Logic Only - No AI)\n');
  console.log('=' .repeat(80) + '\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const { message, expectedType, description, currentProduct } = testCase;
    
    try {
      const intent = await analyzeIntent(message, currentProduct || null, []);
      
      const isCorrect = intent.type === expectedType;
      
      if (isCorrect) {
        passed++;
        console.log(`✅ PASS: ${description}`);
      } else {
        failed++;
        console.log(`❌ FAIL: ${description}`);
        console.log(`   Message: "${message}"`);
        console.log(`   Expected: ${expectedType}`);
        console.log(`   Got: ${intent.type}`);
      }
      
      console.log(`   Intent: ${JSON.stringify(intent, null, 2)}`);
      console.log('');
    } catch (error: any) {
      failed++;
      console.log(`❌ ERROR: ${description}`);
      console.log(`   Message: "${message}"`);
      console.log(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('=' .repeat(80));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Intent detection is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results above.\n');
  }
}

runTests().catch(console.error);

