// Load environment variables FIRST using require() to ensure it runs before imports
// This is necessary because imports are hoisted in JavaScript/TypeScript
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local file
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (result.error) {
  console.warn('⚠️  Warning: Could not load .env.local file:', result.error.message);
}

// Clean up DATABASE_URL if it has nested assignment (fixes malformed .env files)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('DATABASE_URL=')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.substring('DATABASE_URL='.length).trim();
  // Remove quotes if present
  if ((process.env.DATABASE_URL.startsWith("'") && process.env.DATABASE_URL.endsWith("'")) ||
      (process.env.DATABASE_URL.startsWith('"') && process.env.DATABASE_URL.endsWith('"'))) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.slice(1, -1);
  }
}

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Please check your .env.local file.');
  process.exit(1);
}

const DEMO_SHOP_DOMAIN = 'demo-store.stylr.app';
const DEMO_ORG_NAME = 'Stylr Demo Store';
const DEMO_ADMIN_EMAIL = 'demo@stylr.app';

// Realistic Nike-style products with detailed information
const demoProducts = [
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-AIR-MAX-90',
    title: 'Air Max 90 Essential',
    description: `The Nike Air Max 90 stays true to its OG running roots with the iconic Waffle sole, stitched overlays and classic TPU accents. Fresh colors give it a modern look while Max Air cushioning adds comfort to your journey.

Key Features:
• Visible Air cushioning in the heel for impact protection
• Rubber Waffle outsole for durability and traction
• Classic design elements with modern materials
• Padded collar and tongue for comfort
• Perforations on the toe box for breathability

Whether you're hitting the streets or the gym, the Air Max 90 delivers timeless style with the performance you need.`,
    price: 12000, // $120.00
    category: 'Footwear',
    type: 'Running Shoes',
    vendor: 'Nike',
    tags: ['running', 'classic', 'air-max', 'casual', 'lifestyle', 'sneakers'],
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1605348532760-6753d2a43385?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
      color: [
        { name: 'Black/White', value: 'black-white', hex: '#000000' },
        { name: 'University Red', value: 'red', hex: '#DC2626' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
      ],
    },
    inStock: true,
    metadata: {
      featured: true,
      materials: ['Leather', 'Synthetic', 'Rubber'],
      weight: '350g',
      season: 'All Season',
      collection: 'Air Max',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-TECH-FLEECE-JACKET',
    title: 'Tech Fleece Full-Zip Hoodie',
    description: `Stay warm and comfortable with the Nike Tech Fleece Full-Zip Hoodie. This premium jacket features innovative Tech Fleece material that provides lightweight warmth without the bulk.

Key Features:
• Tech Fleece material for lightweight warmth
• Full-zip front with stand-up collar
• Zippered side pockets for secure storage
• Ribbed cuffs and hem for a secure fit
• Modern athletic silhouette
• Moisture-wicking properties

Perfect for training, casual wear, or layering on cooler days. The Tech Fleece collection combines style with performance technology.`,
    price: 11000, // $110.00
    category: 'Apparel',
    type: 'Jacket',
    vendor: 'Nike',
    tags: ['jacket', 'tech-fleece', 'hoodie', 'athletic', 'warm', 'training'],
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['S', 'M', 'L', 'XL', 'XXL'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Charcoal Grey', value: 'grey', hex: '#374151' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
      ],
    },
    inStock: true,
    metadata: {
      featured: true,
      materials: ['Polyester', 'Cotton', 'Spandex'],
      weight: '450g',
      season: 'Fall/Winter',
      collection: 'Tech Fleece',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-DRI-FIT-TEE',
    title: 'Dri-FIT ADV Men\'s Training T-Shirt',
    description: `Train harder and longer with the Nike Dri-FIT ADV Training T-Shirt. Engineered with advanced sweat-wicking technology, this shirt keeps you dry and comfortable during your most intense workouts.

Key Features:
• Dri-FIT ADV technology for superior moisture management
• Four-way stretch fabric for unrestricted movement
• Ventilated mesh panels for enhanced breathability
• Raglan sleeves for improved range of motion
• Modern athletic fit
• Odor-resistant technology

Whether you're lifting weights, running, or doing HIIT, this shirt delivers the performance and comfort you need to push your limits.`,
    price: 3500, // $35.00
    category: 'Apparel',
    type: 'T-Shirt',
    vendor: 'Nike',
    tags: ['t-shirt', 'dri-fit', 'training', 'moisture-wicking', 'athletic', 'performance'],
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['S', 'M', 'L', 'XL', 'XXL'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'White', value: 'white', hex: '#FFFFFF' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
        { name: 'Grey', value: 'grey', hex: '#6B7280' },
      ],
    },
    inStock: true,
    metadata: {
      featured: false,
      materials: ['Polyester', 'Spandex'],
      weight: '120g',
      season: 'All Season',
      collection: 'Dri-FIT ADV',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-TRACKSUIT-SET',
    title: 'Sportswear Club Fleece Tracksuit',
    description: `Complete your workout wardrobe with the Nike Sportswear Club Fleece Tracksuit. This matching set delivers classic style with comfortable fleece construction.

Key Features:
• Soft fleece fabric for comfort and warmth
• Relaxed fit for easy movement
• Elastic waistband with drawstring on pants
• Zippered pockets on jacket
• Ribbed cuffs and hem
• Matching set design

Perfect for training, recovery, or casual wear. The Club Fleece collection offers timeless athletic style with everyday comfort.`,
    price: 9500, // $95.00
    category: 'Apparel',
    type: 'Tracksuit',
    vendor: 'Nike',
    tags: ['tracksuit', 'fleece', 'matching-set', 'athletic', 'casual', 'warm'],
    images: [
      'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1594938291221-94f18ab4e9d3?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['S', 'M', 'L', 'XL', 'XXL'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Grey', value: 'grey', hex: '#6B7280' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
      ],
    },
    inStock: true,
    metadata: {
      featured: true,
      materials: ['Cotton', 'Polyester'],
      weight: '800g',
      season: 'Fall/Winter',
      collection: 'Sportswear Club',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-TRAINING-PANTS',
    title: 'Dri-FIT ADV Men\'s Training Pants',
    description: `Elevate your training with the Nike Dri-FIT ADV Training Pants. Designed for performance and comfort, these pants feature advanced fabric technology and strategic ventilation.

Key Features:
• Dri-FIT ADV technology for moisture management
• Four-way stretch for unrestricted movement
• Elastic waistband with drawstring
• Zippered side pockets
• Articulated knees for better mobility
• Ankle cuffs for secure fit

Whether you're hitting the gym, going for a run, or practicing yoga, these pants provide the flexibility and comfort you need for any activity.`,
    price: 6500, // $65.00
    category: 'Apparel',
    type: 'Pants',
    vendor: 'Nike',
    tags: ['pants', 'training', 'dri-fit', 'athletic', 'performance', 'flexible'],
    images: [
      'https://images.unsplash.com/photo-1594938291221-94f18ab4e9d3?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['S', 'M', 'L', 'XL', 'XXL'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Charcoal Grey', value: 'grey', hex: '#374151' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
      ],
    },
    inStock: true,
    metadata: {
      featured: false,
      materials: ['Polyester', 'Spandex'],
      weight: '280g',
      season: 'All Season',
      collection: 'Dri-FIT ADV',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-BASEBALL-CAP',
    title: 'Sportswear Heritage86 Cap',
    description: `Complete your look with the Nike Sportswear Heritage86 Cap. This classic baseball cap features the iconic Nike Swoosh and comfortable fit.

Key Features:
• Structured crown with curved visor
• Adjustable strapback closure
• Breathable mesh back panel
• Embroidered Swoosh logo
• Pre-curved visor
• Classic six-panel design

A timeless accessory that pairs with any outfit. The Heritage86 Cap combines classic style with modern comfort.`,
    price: 2500, // $25.00
    category: 'Accessories',
    type: 'Cap',
    vendor: 'Nike',
    tags: ['cap', 'hat', 'baseball-cap', 'accessories', 'casual', 'heritage'],
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['One Size'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
        { name: 'White', value: 'white', hex: '#FFFFFF' },
        { name: 'Red', value: 'red', hex: '#DC2626' },
      ],
    },
    inStock: true,
    metadata: {
      featured: false,
      materials: ['Cotton', 'Polyester', 'Mesh'],
      weight: '80g',
      season: 'All Season',
      collection: 'Heritage86',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-TRAINING-SHORTS',
    title: 'Dri-FIT ADV Men\'s Training Shorts',
    description: `Train with confidence in the Nike Dri-FIT ADV Training Shorts. These lightweight shorts are designed for performance with advanced moisture-wicking technology.

Key Features:
• Dri-FIT ADV technology for superior sweat management
• Lightweight, breathable fabric
• Elastic waistband with drawstring
• Side pockets for essentials
• Split hem design for freedom of movement
• 7-inch inseam for optimal coverage

Perfect for running, training, or any high-intensity activity. These shorts keep you cool and comfortable when the heat is on.`,
    price: 4500, // $45.00
    category: 'Apparel',
    type: 'Shorts',
    vendor: 'Nike',
    tags: ['shorts', 'training', 'dri-fit', 'athletic', 'performance', 'lightweight'],
    images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1594938291221-94f18ab4e9d3?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['S', 'M', 'L', 'XL', 'XXL'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
        { name: 'Grey', value: 'grey', hex: '#6B7280' },
      ],
    },
    inStock: true,
    metadata: {
      featured: false,
      materials: ['Polyester', 'Spandex'],
      weight: '150g',
      season: 'Spring/Summer',
      collection: 'Dri-FIT ADV',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-PULLOVER-HOODIE',
    title: 'Sportswear Club Fleece Pullover Hoodie',
    description: `Stay cozy and comfortable with the Nike Sportswear Club Fleece Pullover Hoodie. This classic hoodie features soft fleece fabric and a relaxed fit.

Key Features:
• Soft fleece fabric for warmth and comfort
• Relaxed fit for easy layering
• Adjustable drawstring hood
• Kangaroo pocket for storage
• Ribbed cuffs and hem
• Classic athletic silhouette

Perfect for training, recovery, or casual wear. The Club Fleece collection offers timeless style with everyday comfort.`,
    price: 6000, // $60.00
    category: 'Apparel',
    type: 'Hoodie',
    vendor: 'Nike',
    tags: ['hoodie', 'pullover', 'fleece', 'casual', 'warm', 'athletic'],
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['S', 'M', 'L', 'XL', 'XXL'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Grey', value: 'grey', hex: '#6B7280' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
        { name: 'University Red', value: 'red', hex: '#DC2626' },
      ],
    },
    inStock: true,
    metadata: {
      featured: true,
      materials: ['Cotton', 'Polyester'],
      weight: '550g',
      season: 'Fall/Winter',
      collection: 'Sportswear Club',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-ATHLETIC-SOCKS',
    title: 'Dri-FIT Crew Socks 3-Pack',
    description: `Keep your feet comfortable and dry with the Nike Dri-FIT Crew Socks. This 3-pack offers excellent moisture management and cushioning for all your activities.

Key Features:
• Dri-FIT technology for moisture-wicking
• Cushioned footbed for comfort
• Arch support for stability
• Yarn construction reduces bulk
• Seamless toe for reduced irritation
• Crew length for coverage

Essential for running, training, or everyday wear. These socks provide the comfort and performance your feet deserve.`,
    price: 1800, // $18.00
    category: 'Accessories',
    type: 'Socks',
    vendor: 'Nike',
    tags: ['socks', 'dri-fit', 'athletic', 'performance', 'moisture-wicking', '3-pack'],
    images: [
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['S (6-8)', 'M (9-11)', 'L (12-14)'],
      color: [
        { name: 'White', value: 'white', hex: '#FFFFFF' },
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Grey', value: 'grey', hex: '#6B7280' },
      ],
    },
    inStock: true,
    metadata: {
      featured: false,
      materials: ['Polyester', 'Nylon', 'Spandex'],
      weight: '60g per pair',
      season: 'All Season',
      collection: 'Dri-FIT',
      packSize: '3 pairs',
    },
  },
  {
    shopDomain: DEMO_SHOP_DOMAIN,
    productId: 'DEMO-SPORTS-BACKPACK',
    title: 'Sportswear Academy Backpack',
    description: `Carry your gear in style with the Nike Sportswear Academy Backpack. This spacious backpack is designed for athletes and students alike.

Key Features:
• Spacious main compartment for gear
• Padded laptop sleeve (fits up to 15" laptops)
• Front zippered pocket for quick access
• Side water bottle pockets
• Padded shoulder straps for comfort
• Top carry handle
• Durable construction

Perfect for the gym, school, or travel. The Academy Backpack combines functionality with classic Nike style.`,
    price: 5500, // $55.00
    category: 'Accessories',
    type: 'Backpack',
    vendor: 'Nike',
    tags: ['backpack', 'bag', 'sports', 'travel', 'gym', 'school'],
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=1200&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&h=1200&fit=crop',
    ],
    variants: {
      size: ['One Size'],
      color: [
        { name: 'Black', value: 'black', hex: '#000000' },
        { name: 'Navy Blue', value: 'navy', hex: '#1E3A8A' },
        { name: 'Grey', value: 'grey', hex: '#6B7280' },
      ],
    },
    inStock: true,
    metadata: {
      featured: false,
      materials: ['Polyester', 'Nylon'],
      weight: '600g',
      capacity: '30L',
      season: 'All Season',
      collection: 'Sportswear Academy',
    },
  },
];

async function setupDemoOrganization() {
  // Dynamically import database modules after env is loaded
  const { db } = await import('../lib/database/db');
  const {
    productCatalog,
    shopPolicies,
    brandGuidelines,
    organizations,
    catalogSources,
    organizationUsage,
    plans,
  } = await import('../lib/database/schema');
  const { eq, and } = await import('drizzle-orm');
  const { PLANS } = await import('../lib/config/plans');

  try {
    console.log('🚀 Setting up demo organization...\n');

    // Step 1: Ensure plans exist
    console.log('📦 Checking plans...');
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
        console.log(`   ✅ Created plan: ${plan.displayName}`);
      } else {
        console.log(`   ⏭️  Plan exists: ${plan.displayName}`);
      }
    }

    // Step 2: Create or update demo organization
    console.log('\n🏢 Setting up demo organization...');
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.shopDomain, DEMO_SHOP_DOMAIN))
      .limit(1);

    if (!existingOrg) {
      const [newOrg] = await db
        .insert(organizations)
        .values({
          shopDomain: DEMO_SHOP_DOMAIN,
          organizationName: DEMO_ORG_NAME,
          adminEmail: DEMO_ADMIN_EMAIL,
          planId: 2, // Pro plan
          status: 'active',
          metadata: {
            demo: true,
            setupDate: new Date().toISOString(),
          },
        })
        .returning();
      console.log(`   ✅ Created organization: ${DEMO_ORG_NAME}`);
    } else {
      // Update existing organization
      await db
        .update(organizations)
        .set({
          organizationName: DEMO_ORG_NAME,
          adminEmail: DEMO_ADMIN_EMAIL,
          planId: 2, // Pro plan
          status: 'active',
          metadata: {
            ...(existingOrg.metadata as object || {}),
            demo: true,
            updatedDate: new Date().toISOString(),
          },
        })
        .where(eq(organizations.shopDomain, DEMO_SHOP_DOMAIN));
      console.log(`   ✅ Updated organization: ${DEMO_ORG_NAME}`);
    }

    // Step 3: Create organization usage record
    console.log('\n📊 Setting up organization usage...');
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const proPlan = PLANS.find(p => p.id === 2);
    
    if (proPlan) {
      const [existingUsage] = await db
        .select()
        .from(organizationUsage)
        .where(
          and(
            eq(organizationUsage.shopDomain, DEMO_SHOP_DOMAIN),
            eq(organizationUsage.month, currentMonth)
          )
        )
        .limit(1);

      if (!existingUsage) {
        await db.insert(organizationUsage).values({
          shopDomain: DEMO_SHOP_DOMAIN,
          month: currentMonth,
          imageGenerationsUsed: 0,
          chatOutputsUsed: 0,
          imageGenerationsLimit: proPlan.imageGenerationsLimit,
          chatOutputsLimit: proPlan.chatOutputsLimit,
          planId: 2,
        });
        console.log(`   ✅ Created usage record for ${currentMonth}`);
      } else {
        console.log(`   ⏭️  Usage record exists for ${currentMonth}`);
      }
    }

    // Step 4: Add products to catalog
    console.log('\n📦 Adding products to catalog...');
    let addedCount = 0;
    let updatedCount = 0;

    for (const product of demoProducts) {
      const [existing] = await db
        .select()
        .from(productCatalog)
        .where(
          and(
            eq(productCatalog.shopDomain, DEMO_SHOP_DOMAIN),
            eq(productCatalog.productId, product.productId)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(productCatalog).values({
          ...product,
          lastSyncedAt: new Date(),
        });
        console.log(`   ✅ Added: ${product.title}`);
        addedCount++;
      } else {
        // Update existing product
        await db
          .update(productCatalog)
          .set({
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            type: product.type,
            vendor: product.vendor,
            tags: product.tags,
            images: product.images,
            variants: product.variants,
            inStock: product.inStock,
            metadata: product.metadata,
            lastSyncedAt: new Date(),
          })
          .where(eq(productCatalog.id, existing.id));
        console.log(`   🔄 Updated: ${product.title}`);
        updatedCount++;
      }
    }

    // Step 5: Set up shop policies
    console.log('\n📋 Setting up shop policies...');
    const [existingPolicy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopDomain, DEMO_SHOP_DOMAIN))
      .limit(1);

    if (!existingPolicy) {
      await db.insert(shopPolicies).values({
        shopDomain: DEMO_SHOP_DOMAIN,
        shippingPolicy: `FREE SHIPPING
Free standard shipping on all orders over $100. Standard shipping typically takes 5-7 business days.

EXPRESS SHIPPING
Express shipping available for $15. Orders placed before 2 PM EST will be processed the same day. Express shipping typically takes 2-3 business days.

INTERNATIONAL SHIPPING
International shipping available to select countries. Shipping costs and delivery times vary by location. Please allow 10-21 business days for international orders.

TRACKING
All orders include tracking information. You'll receive an email with your tracking number once your order ships.`,
        returnPolicy: `30-DAY RETURN POLICY
We want you to love your purchase. If you're not completely satisfied, you can return most items within 30 days of delivery.

CONDITIONS
• Items must be unworn, unwashed, and in original packaging
• Items must have all tags attached
• Original receipt or proof of purchase required
• Final sale items are not eligible for return

FREE RETURNS
We offer free returns on all orders. Simply initiate a return through your account or contact our customer service team.

REFUND PROCESSING
Refunds will be processed to your original payment method within 5-10 business days after we receive your return.`,
        privacyPolicy: `PRIVACY POLICY

YOUR PRIVACY MATTERS
At Stylr Demo Store, we are committed to protecting your privacy and personal information.

INFORMATION WE COLLECT
We collect information that you provide directly to us, such as when you create an account, make a purchase, or contact us for support.

HOW WE USE YOUR INFORMATION
We use your information to process orders, provide customer service, send you updates about your order, and improve our services.

DATA SECURITY
We implement appropriate security measures to protect your personal information. Your data is encrypted and stored securely.

THIRD-PARTY SERVICES
We may use third-party services to help us operate our store and process payments. These services have their own privacy policies.

YOUR RIGHTS
You have the right to access, update, or delete your personal information at any time. Contact us if you have any questions about your privacy.`,
        termsOfService: `TERMS OF SERVICE

ACCEPTANCE OF TERMS
By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.

PRODUCT INFORMATION
We strive to provide accurate product information, but we do not warrant that product descriptions or other content is accurate, complete, reliable, current, or error-free.

PRICING
All prices are in USD and are subject to change without notice. We reserve the right to modify prices at any time.

ORDERS
We reserve the right to refuse or cancel any order for any reason, including if the product is unavailable, there is an error in pricing, or we suspect fraudulent activity.

LIMITATION OF LIABILITY
In no event shall Stylr Demo Store be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of our services.`,
        customPolicies: {
          demo: true,
          note: 'This is a demo store for demonstration purposes only.',
        },
      });
      console.log('   ✅ Added shop policies');
    } else {
      console.log('   ⏭️  Shop policies already exist');
    }

    // Step 6: Set up brand guidelines
    console.log('\n🎨 Setting up brand guidelines...');
    try {
      const [existingGuidelines] = await db
        .select()
        .from(brandGuidelines)
        .where(eq(brandGuidelines.shopDomain, DEMO_SHOP_DOMAIN))
        .limit(1);

      if (!existingGuidelines) {
        await db.insert(brandGuidelines).values({
          shopDomain: DEMO_SHOP_DOMAIN,
          aboutBrand: `ABOUT STYLR DEMO STORE

Welcome to Stylr Demo Store, your destination for premium athletic wear and footwear. We're passionate about providing high-quality products that combine style, performance, and innovation.

OUR MISSION
To inspire and enable athletes of all levels to achieve their best performance through innovative products and exceptional service.

OUR VALUES
• Quality: We stand behind every product we sell
• Innovation: We're constantly evolving to meet your needs
• Community: We're committed to supporting athletes and fitness enthusiasts
• Sustainability: We're working towards a more sustainable future

OUR STORY
Founded with a passion for athletic excellence, Stylr Demo Store has been serving customers for over a decade. We've built our reputation on quality products, outstanding customer service, and a commitment to helping you reach your goals.

WHY CHOOSE US
• Premium quality products from trusted brands
• Expert customer service team
• Fast and reliable shipping
• Easy returns and exchanges
• Competitive prices

Join thousands of satisfied customers who trust Stylr Demo Store for their athletic needs.`,
        });
        console.log('   ✅ Added brand guidelines');
      } else {
        console.log('   ⏭️  Brand guidelines already exist');
      }
    } catch (error: any) {
      // Table might not exist yet - that's okay, it's optional for demo
      if (error?.code === '42P01') {
        console.log('   ⚠️  Brand guidelines table does not exist yet (skipping)');
        console.log('   💡 Run database migrations to create all tables');
      } else {
        throw error;
      }
    }

    // Step 7: Create catalog source (database adapter for demo)
    console.log('\n🔗 Setting up catalog source...');
    try {
      const [existingSource] = await db
        .select()
        .from(catalogSources)
        .where(
          and(
            eq(catalogSources.shopDomain, DEMO_SHOP_DOMAIN),
            eq(catalogSources.name, 'Demo Product Catalog')
          )
        )
        .limit(1);

      if (!existingSource) {
        await db.insert(catalogSources).values({
          shopDomain: DEMO_SHOP_DOMAIN,
          name: 'Demo Product Catalog',
          sourceType: 'database_postgresql', // Use database_postgresql type but with internal config
          status: 'active',
          connectionConfig: {
            // Internal type tells the adapter to use existing db connection
            type: 'internal',
            shopDomain: DEMO_SHOP_DOMAIN,
          },
          schemaMapping: {
            productId: 'product_id',
            title: 'title',
            description: 'description',
            price: 'price',
            category: 'category',
            type: 'type',
            vendor: 'vendor',
            tags: 'tags',
            images: 'images',
            variants: 'variants',
            inStock: 'in_stock',
            metadata: 'metadata',
          },
          cacheEnabled: true,
          cacheTtlSeconds: 300, // 5 minutes
          syncEnabled: true,
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
          productCount: demoProducts.length,
          metadata: {
            demo: true,
            source: 'internal_database',
          },
        });
        console.log('   ✅ Created catalog source');
      } else {
        // Update existing source
        await db
          .update(catalogSources)
          .set({
            status: 'active',
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
            productCount: demoProducts.length,
          })
          .where(eq(catalogSources.id, existingSource.id));
        console.log('   ✅ Updated catalog source');
      }
    } catch (error: any) {
      // Table might not exist yet - that's okay, it's optional for demo
      if (error?.code === '42P01') {
        console.log('   ⚠️  Catalog sources table does not exist yet (skipping)');
        console.log('   💡 Run database migrations to create all tables');
        console.log('   💡 For now, products are stored directly in product_catalog table');
      } else {
        throw error;
      }
    }

    // Summary
    console.log('\n✨ Demo organization setup complete!');
    console.log('\n📊 Summary:');
    console.log(`   • Organization: ${DEMO_ORG_NAME}`);
    console.log(`   • Shop Domain: ${DEMO_SHOP_DOMAIN}`);
    console.log(`   • Products Added: ${addedCount}`);
    console.log(`   • Products Updated: ${updatedCount}`);
    console.log(`   • Total Products: ${demoProducts.length}`);
    console.log(`   • Shop Policies: ✅`);
    console.log(`   • Brand Guidelines: ✅`);
    console.log(`   • Catalog Source: ✅`);
    console.log(`   • Organization Usage: ✅`);
    console.log('\n🎉 Your demo store is ready!');
    console.log(`\n💡 Next steps:`);
    console.log(`   • Visit /store to see the products`);
    console.log(`   • Visit /demo to test the widget`);
    console.log(`   • Use shop domain: ${DEMO_SHOP_DOMAIN}`);
  } catch (error) {
    console.error('❌ Error setting up demo organization:', error);
    throw error;
  }
}

setupDemoOrganization()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

