import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { db } from '../lib/database/db';
import { productCatalog, shopPolicies } from '../lib/database/schema';
import { eq } from 'drizzle-orm';

const TEST_SHOP_DOMAIN = 'test-store.myshopify.com';

// Dummy products
const dummyProducts = [
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-001',
    title: 'Classic Blue Denim Jacket',
    description: 'A timeless blue denim jacket perfect for any season. Made from premium denim with a comfortable fit.',
    price: 8900, // $89.00
    category: 'Jackets',
    type: 'Denim Jacket',
    vendor: 'Fashion Co',
    tags: ['denim', 'blue', 'casual', 'jacket'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['S', 'M', 'L', 'XL'], color: ['Blue'] },
    inStock: true,
    metadata: { featured: true },
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-002',
    title: 'Black Leather Motorcycle Jacket',
    description: 'Stylish black leather jacket with a classic motorcycle design. Perfect for a bold, edgy look.',
    price: 19900, // $199.00
    category: 'Jackets',
    type: 'Leather Jacket',
    vendor: 'Fashion Co',
    tags: ['leather', 'black', 'motorcycle', 'edgy'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['S', 'M', 'L'], color: ['Black'] },
    inStock: true,
    metadata: { featured: true },
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-003',
    title: 'Navy Blue Wool Coat',
    description: 'Elegant navy blue wool coat for winter. Warm, comfortable, and stylish.',
    price: 14900, // $149.00
    category: 'Jackets',
    type: 'Wool Coat',
    vendor: 'Fashion Co',
    tags: ['wool', 'navy', 'winter', 'formal'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['S', 'M', 'L', 'XL'], color: ['Navy'] },
    inStock: true,
    metadata: {},
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-004',
    title: 'Red Bomber Jacket',
    description: 'Vibrant red bomber jacket with a modern design. Stand out with this bold piece.',
    price: 12900, // $129.00
    category: 'Jackets',
    type: 'Bomber Jacket',
    vendor: 'Fashion Co',
    tags: ['bomber', 'red', 'casual', 'modern'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['S', 'M', 'L'], color: ['Red'] },
    inStock: true,
    metadata: {},
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-005',
    title: 'Green Parka Jacket',
    description: 'Durable green parka jacket perfect for outdoor adventures. Water-resistant and warm.',
    price: 17900, // $179.00
    category: 'Jackets',
    type: 'Parka',
    vendor: 'Fashion Co',
    tags: ['parka', 'green', 'outdoor', 'waterproof'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['M', 'L', 'XL'], color: ['Green'] },
    inStock: true,
    metadata: {},
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-006',
    title: 'Gray Hooded Sweatshirt',
    description: 'Comfortable gray hooded sweatshirt for everyday wear. Soft and cozy.',
    price: 4900, // $49.00
    category: 'Sweaters',
    type: 'Hoodie',
    vendor: 'Fashion Co',
    tags: ['hoodie', 'gray', 'casual', 'comfortable'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['S', 'M', 'L', 'XL'], color: ['Gray'] },
    inStock: true,
    metadata: {},
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-007',
    title: 'White Cotton T-Shirt',
    description: 'Classic white cotton t-shirt. Essential wardrobe piece.',
    price: 1999, // $19.99
    category: 'Shirts',
    type: 'T-Shirt',
    vendor: 'Fashion Co',
    tags: ['t-shirt', 'white', 'cotton', 'basic'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['S', 'M', 'L', 'XL'], color: ['White'] },
    inStock: true,
    metadata: {},
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-008',
    title: 'Black Slim Fit Jeans',
    description: 'Stylish black slim fit jeans. Perfect for a modern look.',
    price: 7900, // $79.00
    category: 'Pants',
    type: 'Jeans',
    vendor: 'Fashion Co',
    tags: ['jeans', 'black', 'slim', 'casual'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['28', '30', '32', '34', '36'], color: ['Black'] },
    inStock: true,
    metadata: {},
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-009',
    title: 'Brown Leather Boots',
    description: 'Classic brown leather boots. Durable and stylish.',
    price: 12900, // $129.00
    category: 'Shoes',
    type: 'Boots',
    vendor: 'Fashion Co',
    tags: ['boots', 'brown', 'leather', 'casual'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['7', '8', '9', '10', '11'], color: ['Brown'] },
    inStock: true,
    metadata: {},
  },
  {
    shopDomain: TEST_SHOP_DOMAIN,
    productId: 'prod-010',
    title: 'Blue Casual Sneakers',
    description: 'Comfortable blue casual sneakers for everyday wear.',
    price: 6900, // $69.00
    category: 'Shoes',
    type: 'Sneakers',
    vendor: 'Fashion Co',
    tags: ['sneakers', 'blue', 'casual', 'comfortable'],
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    variants: { size: ['7', '8', '9', '10', '11'], color: ['Blue'] },
    inStock: true,
    metadata: {},
  },
];

async function addDummyData() {
  try {
    console.log('🌱 Adding dummy data...\n');

    // Add products
    console.log('📦 Adding products...');
    for (const product of dummyProducts) {
      const [existing] = await db
        .select()
        .from(productCatalog)
        .where(eq(productCatalog.productId, product.productId))
        .limit(1);

      if (!existing) {
        await db.insert(productCatalog).values(product);
        console.log(`   ✅ Added: ${product.title}`);
      } else {
        console.log(`   ⏭️  Already exists: ${product.title}`);
      }
    }

    // Add shop policies
    console.log('\n📋 Adding shop policies...');
    const [existingPolicy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopDomain, TEST_SHOP_DOMAIN))
      .limit(1);

    if (!existingPolicy) {
      await db.insert(shopPolicies).values({
        shopDomain: TEST_SHOP_DOMAIN,
        shippingPolicy: 'Free shipping on orders over $100. Standard shipping takes 5-7 business days. Express shipping available for $15.',
        returnPolicy: '30-day return policy. Items must be unworn and in original packaging. Free returns for all orders.',
        privacyPolicy: 'We respect your privacy. Your data is secure and never shared with third parties.',
        termsOfService: 'By using our service, you agree to our terms of service. All sales are final unless otherwise stated.',
        customPolicies: {},
      });
      console.log('   ✅ Added shop policies');
    } else {
      console.log('   ⏭️  Shop policies already exist');
    }

    console.log('\n✨ Dummy data added successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Products: ${dummyProducts.length}`);
    console.log(`   - Shop Domain: ${TEST_SHOP_DOMAIN}`);
    console.log(`   - Shop Policies: Added`);
  } catch (error) {
    console.error('❌ Error adding dummy data:', error);
    throw error;
  }
}

addDummyData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

