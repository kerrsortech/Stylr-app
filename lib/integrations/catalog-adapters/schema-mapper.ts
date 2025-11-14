/**
 * Schema mapper - transforms products from different formats to our standard format
 */

import { Product } from './base-adapter';

export interface SchemaMapping {
  productId?: string; // Field name for product ID
  title?: string; // Field name for title
  description?: string;
  price?: string; // Field name for price (will be converted to cents)
  category?: string;
  type?: string;
  vendor?: string;
  tags?: string; // Field name or array field
  images?: string; // Field name or array field
  variants?: string;
  inStock?: string;
  metadata?: Record<string, string>; // Map additional fields
}

/**
 * Map a product from source format to our standard format
 */
export function mapProduct(
  sourceProduct: any,
  mapping: SchemaMapping
): Product {
  const getValue = (field: string | undefined, defaultValue?: any) => {
    if (!field) return defaultValue;
    
    // Support nested fields with dot notation (e.g., "product.name")
    const parts = field.split('.');
    let value = sourceProduct;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    return value ?? defaultValue;
  };

  const getArray = (field: string | undefined): string[] => {
    const value = getValue(field);
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return [];
  };

  // Extract price and convert to cents
  const priceValue = getValue(mapping.price, 0);
  const priceInCents = typeof priceValue === 'number'
    ? Math.round(priceValue * 100) // Assume it's in dollars
    : typeof priceValue === 'string'
    ? Math.round(parseFloat(priceValue.replace(/[^0-9.]/g, '')) * 100)
    : 0;

  // Extract inStock
  const inStockValue = getValue(mapping.inStock, true);
  const inStock = typeof inStockValue === 'boolean'
    ? inStockValue
    : typeof inStockValue === 'string'
    ? inStockValue.toLowerCase() === 'true' || inStockValue.toLowerCase() === 'yes' || inStockValue === '1'
    : true;

  // Build metadata from additional fields
  const metadata: Record<string, any> = {};
  if (mapping.metadata) {
    for (const [key, field] of Object.entries(mapping.metadata)) {
      const value = getValue(field);
      if (value !== undefined) {
        metadata[key] = value;
      }
    }
  }

  return {
    id: String(getValue(mapping.productId, getValue('id', getValue('productId', '')))),
    title: String(getValue(mapping.title, getValue('title', getValue('name', 'Untitled Product')))),
    description: getValue(mapping.description, getValue('description', '')),
    price: priceInCents,
    category: getValue(mapping.category, getValue('category', getValue('type', ''))),
    type: getValue(mapping.type, ''),
    vendor: getValue(mapping.vendor, getValue('vendor', getValue('brand', ''))),
    tags: getArray(mapping.tags || 'tags'),
    images: getArray(mapping.images || 'images'),
    variants: getValue(mapping.variants, getValue('variants', {})),
    inStock,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

/**
 * Auto-detect schema mapping by analyzing sample products
 */
export function autoDetectMapping(sampleProducts: any[]): SchemaMapping {
  if (!sampleProducts || sampleProducts.length === 0) {
    return {};
  }

  const sample = sampleProducts[0];
  const keys = Object.keys(sample);

  const mapping: SchemaMapping = {};

  // Common field name patterns
  const patterns = {
    productId: ['id', 'productId', 'product_id', 'sku', 'itemId'],
    title: ['title', 'name', 'productName', 'product_name'],
    description: ['description', 'desc', 'details', 'productDescription'],
    price: ['price', 'cost', 'amount', 'productPrice', 'salePrice'],
    category: ['category', 'categories', 'productCategory', 'type'],
    type: ['type', 'productType', 'itemType'],
    vendor: ['vendor', 'brand', 'manufacturer', 'seller'],
    tags: ['tags', 'tag', 'keywords', 'labels'],
    images: ['images', 'image', 'imageUrl', 'image_url', 'photos', 'pictures'],
    variants: ['variants', 'options', 'attributes'],
    inStock: ['inStock', 'in_stock', 'available', 'stock', 'quantity'],
  };

  for (const [field, possibleNames] of Object.entries(patterns)) {
    const found = possibleNames.find(name => keys.includes(name));
    if (found) {
      (mapping as any)[field] = found;
    }
  }

  return mapping;
}


