import { db } from '../lib/database/db';
import { plans, organizations } from '../lib/database/schema';
import { PLANS } from '../lib/config/plans';
import { eq } from 'drizzle-orm';

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Seed plans
    console.log('📦 Seeding plans...');
    for (const plan of PLANS) {
      const [existing] = await db
        .select()
        .from(plans)
        .where(eq(plans.name, plan.name))
        .limit(1);

      if (!existing) {
        await db.insert(plans).values({
          name: plan.name,
          displayName: plan.displayName,
          priceCents: plan.priceCents,
          imageGenerationsLimit: plan.imageGenerationsLimit,
          chatOutputsLimit: plan.chatOutputsLimit,
          imageResolution: plan.imageResolution,
          isPopular: plan.isPopular,
          features: plan.features || [],
        });
        console.log(`✅ Created plan: ${plan.displayName}`);
      } else {
        console.log(`⏭️  Plan already exists: ${plan.displayName}`);
      }
    }

    // Seed test organization
    console.log('🏢 Seeding test organization...');
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.shopDomain, 'test-store.myshopify.com'))
      .limit(1);

    if (!existingOrg) {
      await db.insert(organizations).values({
        shopDomain: 'test-store.myshopify.com',
        organizationName: 'Test Store',
        adminEmail: 'admin@test-store.com',
        planId: 2, // Pro plan
        status: 'active',
        metadata: {},
      });
      console.log('✅ Created test organization: test-store.myshopify.com');
    } else {
      console.log('⏭️  Test organization already exists');
    }

    console.log('✨ Database seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log('✅ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

