import { pgTable, serial, text, timestamp, integer, jsonb, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent']);
export const tryOnStatusEnum = pgEnum('try_on_status', ['processing', 'completed', 'failed']);
// Note: eventTypeEnum removed - analytics events are tracked via existing tables (tryOnHistory, conversations, sessions)
export const catalogSourceTypeEnum = pgEnum('catalog_source_type', [
  'shopify',
  'woocommerce',
  'bigcommerce',
  'magento',
  'csv',
  'database_postgresql',
  'database_mysql',
  'database_mongodb',
  'api_rest',
  'api_custom',
]);
export const catalogSourceStatusEnum = pgEnum('catalog_source_status', ['active', 'inactive', 'error', 'syncing']);

// Sessions table - track user sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  customerId: text('customer_id'),
  customerEmail: text('customer_email'), // User's email from auth platform
  customerName: text('customer_name'), // User's name from auth platform
  standingPhotoUrl: text('standing_photo_url'), // S3 URL for standing photo
  portraitPhotoUrl: text('portrait_photo_url'), // S3 URL for portrait photo
  userPhotoUrl: text('user_photo_url'), // S3 URL for selected/active photo
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
});

// Conversations table - store conversation history
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  customerId: text('customer_id'), // User ID - for privacy: chat history only visible to this user
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // { products: [], intent: {}, etc }
  timestamp: timestamp('timestamp').defaultNow(),
});

// Tickets table - support tickets
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  ticketId: text('ticket_id').notNull().unique(),
  sessionId: text('session_id').notNull(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  customerId: text('customer_id'),
  customerEmail: text('customer_email'),
  customerName: text('customer_name'), // User's name from auth platform
  issueCategory: text('issue_category').notNull(),
  issueDescription: text('issue_description').notNull(),
  status: ticketStatusEnum('status').notNull().default('open'),
  priority: ticketPriorityEnum('priority').default('medium'),
  metadata: jsonb('metadata'), // { currentProduct, conversationContext, userDetails, etc }
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

// Try-On history table - track try-on generations
export const tryOnHistory = pgTable('try_on_history', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  customerId: text('customer_id'),
  productId: text('product_id').notNull(),
  productCategory: text('product_category').notNull(),
  userPhotoUrl: text('user_photo_url').notNull(),
  productImageUrl: text('product_image_url').notNull(),
  generatedImageUrl: text('generated_image_url'),
  status: tryOnStatusEnum('status').notNull(),
  errorMessage: text('error_message'),
  generationTimeMs: integer('generation_time_ms'),
  metadata: jsonb('metadata'), // { prompt, categoryConfig, etc }
  createdAt: timestamp('created_at').defaultNow(),
});

// Product catalog cache - cache product data for faster access
export const productCatalog = pgTable('product_catalog', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  productId: text('product_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // in cents
  category: text('category'),
  type: text('type'),
  vendor: text('vendor'),
  tags: text('tags').array(),
  images: text('images').array(),
  variants: jsonb('variants'),
  inStock: boolean('in_stock').default(true),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
  metadata: jsonb('metadata'),
});

// Shop policies - store company policies
export const shopPolicies = pgTable('shop_policies', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull().unique(),
  organizationName: text('organization_name').notNull(),
  shippingPolicy: text('shipping_policy'),
  returnPolicy: text('return_policy'),
  privacyPolicy: text('privacy_policy'),
  termsOfService: text('terms_of_service'),
  customPolicies: jsonb('custom_policies'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Policy files - store policy documents uploaded to S3
export const policyFiles = pgTable('policy_files', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  policyType: text('policy_type').notNull(), // 'shipping' | 'return' | 'refund' | 'privacy' | 'terms' | 'custom'
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(), // S3 key
  fileUrl: text('file_url').notNull(), // S3 public URL
  fileSize: integer('file_size'), // in bytes
  mimeType: text('mime_type'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Brand guidelines - store brand guidelines and about brand documents
export const brandGuidelines = pgTable('brand_guidelines', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull().unique(),
  organizationName: text('organization_name').notNull(),
  aboutBrand: text('about_brand'), // Text content or reference
  brandGuidelinesPath: text('brand_guidelines_path'), // S3 key for brand guidelines file
  brandGuidelinesUrl: text('brand_guidelines_url'), // S3 public URL
  brandGuidelinesFileName: text('brand_guidelines_file_name'),
  aboutBrandPath: text('about_brand_path'), // S3 key for about brand file
  aboutBrandUrl: text('about_brand_url'), // S3 public URL
  aboutBrandFileName: text('about_brand_file_name'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Note: Analytics events are tracked via tryOnHistory, conversations, and sessions tables
// No separate analyticsEvents table needed - data is reused from existing tables

// Note: API usage is tracked via organizationUsage table
// No separate apiUsage table needed - usage is aggregated monthly per organization

// Organizations table - track clients/organizations
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull().unique(),
  organizationName: text('organization_name').notNull(),
  adminEmail: text('admin_email').notNull(),
  planId: integer('plan_id').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'suspended' | 'cancelled'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: jsonb('metadata'),
});

// Plans table - subscription plans
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // 'basic' | 'pro' | 'elite' | 'enterprise'
  displayName: text('display_name').notNull(),
  priceCents: integer('price_cents').notNull(), // Monthly price in cents
  imageGenerationsLimit: integer('image_generations_limit').notNull(),
  chatOutputsLimit: integer('chat_outputs_limit').notNull(),
  imageResolution: text('image_resolution').notNull(), // '2K' | '4K'
  isPopular: boolean('is_popular').default(false),
  features: jsonb('features'), // Additional features
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Organization usage tracking - track monthly usage per organization
export const organizationUsage = pgTable('organization_usage', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  month: text('month').notNull(), // Format: 'YYYY-MM'
  imageGenerationsUsed: integer('image_generations_used').default(0),
  chatOutputsUsed: integer('chat_outputs_used').default(0),
  imageGenerationsLimit: integer('image_generations_limit').notNull(),
  chatOutputsLimit: integer('chat_outputs_limit').notNull(),
  planId: integer('plan_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Authentication integrations - store auth platform configurations
export const authIntegrations = pgTable('auth_integrations', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  authPlatform: text('auth_platform').notNull(), // 'shopify', 'woocommerce', 'custom', 'none'
  config: jsonb('config').notNull(), // Platform-specific configuration
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Catalog sources - store connection info for product catalogs (not the products themselves)
export const catalogSources = pgTable('catalog_sources', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  name: text('name').notNull(), // Display name for the source
  sourceType: catalogSourceTypeEnum('source_type').notNull(),
  status: catalogSourceStatusEnum('status').notNull().default('active'),
  
  // Connection configuration (encrypted in production)
  // For APIs: { url, apiKey, apiSecret, headers }
  // For Databases: { host, port, database, username, password, table, query }
  // For CSV: { fileUrl, s3Key, mapping }
  // For Custom: { endpoint, authType, credentials }
  connectionConfig: jsonb('connection_config').notNull(),
  
  // Schema mapping - how to map their product format to our standard format
  // { productId: 'id', title: 'name', price: 'cost', category: 'type', ... }
  schemaMapping: jsonb('schema_mapping'),
  
  // Cache settings
  cacheEnabled: boolean('cache_enabled').default(true),
  cacheTtlSeconds: integer('cache_ttl_seconds').default(300), // 5 minutes default
  
  // Sync settings
  syncEnabled: boolean('sync_enabled').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: text('last_sync_status'), // 'success' | 'error' | 'partial'
  lastSyncError: text('last_sync_error'),
  productCount: integer('product_count').default(0), // Cached count
  
  // Metadata
  metadata: jsonb('metadata'), // Additional platform-specific settings
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Purchases table - optional fallback for manual purchase tracking
// Primary conversion tracking uses order history from e-commerce platforms
// This table is kept for webhook-based tracking or platforms without order history API
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  shopDomain: text('shop_domain').notNull(),
  organizationName: text('organization_name').notNull(),
  sessionId: text('session_id'), // Link to session if available
  customerId: text('customer_id'), // Link to customer if available
  productId: text('product_id').notNull(),
  orderId: text('order_id'), // External order ID from e-commerce platform
  quantity: integer('quantity').default(1),
  priceCents: integer('price_cents').notNull(), // Price at time of purchase
  currency: text('currency').default('USD'),
  metadata: jsonb('metadata'), // { orderDetails, paymentMethod, etc }
  createdAt: timestamp('created_at').defaultNow(),
});

