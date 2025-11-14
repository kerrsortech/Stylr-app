// Load environment variables
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { db } from '../lib/database/db';
import { getRedisClient } from '../lib/cache/redis-client';
import { GeminiClient } from '../lib/ai/gemini-client';
import { ReplicateClient } from '../lib/ai/replicate-client';
import { plans, organizations } from '../lib/database/schema';
import { eq } from 'drizzle-orm';

async function verifySetup() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const successes: string[] = [];

  console.log('🔍 Verifying setup...\n');

  // 1. Check environment variables
  console.log('📋 Checking environment variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'GOOGLE_GEMINI_API_KEY',
    'REPLICATE_API_TOKEN',
    'REDIS_URL',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing environment variable: ${envVar}`);
      console.log(`  ❌ ${envVar}: NOT SET`);
    } else {
      successes.push(`Environment variable: ${envVar}`);
      console.log(`  ✅ ${envVar}: SET`);
    }
  }

  // 2. Check database connection
  console.log('\n🗄️  Checking database connection...');
  try {
    const [plan] = await db.select().from(plans).limit(1);
    if (plan) {
      successes.push('Database connection: OK');
      console.log('  ✅ Database connection: OK');
    } else {
      warnings.push('Database connected but no plans found');
      console.log('  ⚠️  Database connected but no plans found');
    }
  } catch (error: any) {
    errors.push(`Database connection failed: ${error.message}`);
    console.log(`  ❌ Database connection: FAILED - ${error.message}`);
  }

  // 3. Check plans in database
  console.log('\n📦 Checking plans in database...');
  try {
    const allPlans = await db.select().from(plans);
    if (allPlans.length > 0) {
      successes.push(`Plans in database: ${allPlans.length}`);
      console.log(`  ✅ Found ${allPlans.length} plans:`);
      allPlans.forEach(plan => {
        console.log(`     - ${plan.displayName} (${plan.name})`);
      });
    } else {
      warnings.push('No plans found in database');
      console.log('  ⚠️  No plans found in database');
    }
  } catch (error: any) {
    errors.push(`Failed to fetch plans: ${error.message}`);
    console.log(`  ❌ Failed to fetch plans: ${error.message}`);
  }

  // 4. Check test organization
  console.log('\n🏢 Checking test organization...');
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.shopDomain, 'test-store.myshopify.com'))
      .limit(1);
    if (org) {
      successes.push('Test organization: Found');
      console.log(`  ✅ Test organization found: ${org.organizationName}`);
      console.log(`     Shop Domain: ${org.shopDomain}`);
      console.log(`     Plan ID: ${org.planId}`);
      console.log(`     Status: ${org.status}`);
    } else {
      warnings.push('Test organization not found');
      console.log('  ⚠️  Test organization not found');
    }
  } catch (error: any) {
    errors.push(`Failed to fetch organization: ${error.message}`);
    console.log(`  ❌ Failed to fetch organization: ${error.message}`);
  }

  // 5. Check Redis connection
  console.log('\n🔴 Checking Redis connection...');
  try {
    const redis = await getRedisClient();
    await redis.ping();
    successes.push('Redis connection: OK');
    console.log('  ✅ Redis connection: OK');
  } catch (error: any) {
    errors.push(`Redis connection failed: ${error.message}`);
    console.log(`  ❌ Redis connection: FAILED - ${error.message}`);
    console.log('     💡 Make sure Redis is running or set REDIS_URL correctly');
  }

  // 6. Check Gemini API
  console.log('\n🤖 Checking Gemini API...');
  try {
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      const gemini = new GeminiClient(process.env.GOOGLE_GEMINI_API_KEY);
      // Just check if client can be created
      successes.push('Gemini API: Client created');
      console.log('  ✅ Gemini API: Client created');
    } else {
      errors.push('Gemini API key not set');
      console.log('  ❌ Gemini API: API key not set');
    }
  } catch (error: any) {
    errors.push(`Gemini API failed: ${error.message}`);
    console.log(`  ❌ Gemini API: FAILED - ${error.message}`);
  }

  // 7. Check Replicate API
  console.log('\n🎨 Checking Replicate API...');
  try {
    if (process.env.REPLICATE_API_TOKEN) {
      const replicate = new ReplicateClient(process.env.REPLICATE_API_TOKEN);
      // Just check if client can be created
      successes.push('Replicate API: Client created');
      console.log('  ✅ Replicate API: Client created');
    } else {
      errors.push('Replicate API token not set');
      console.log('  ❌ Replicate API: Token not set');
    }
  } catch (error: any) {
    errors.push(`Replicate API failed: ${error.message}`);
    console.log(`  ❌ Replicate API: FAILED - ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Setup Verification Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successes: ${successes.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors that need to be fixed:');
    errors.forEach(error => console.log(`   - ${error}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n🎉 All checks passed! Your setup is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Visit http://localhost:3000/demo to test the chat');
    console.log('   3. Use shop domain: test-store.myshopify.com');
  } else if (errors.length === 0) {
    console.log('\n✅ Setup is mostly ready, but check the warnings above.');
  } else {
    console.log('\n❌ Please fix the errors above before proceeding.');
    process.exit(1);
  }
}

verifySetup()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

