export interface ComplementaryMap {
  [key: string]: string[];
}

// Domain knowledge: complementary products
// When user views a product in one category, recommend items from complementary categories
const COMPLEMENTARY_PRODUCTS: ComplementaryMap = {
  'jacket': ['pants', 'jeans', 'trousers', 'shoes', 'boots', 'sneakers', 'shirt', 't-shirt', 'sweater', 'hoodie', 'belt', 'scarf', 'beanie', 'gloves'],
  'coat': ['pants', 'jeans', 'trousers', 'shoes', 'boots', 'sneakers', 'shirt', 't-shirt', 'sweater', 'hoodie', 'belt', 'scarf', 'beanie', 'gloves'],
  'bomber': ['pants', 'jeans', 'trousers', 'shoes', 'boots', 'sneakers', 'shirt', 't-shirt', 'sweater', 'hoodie', 'belt'],
  'denim': ['shirt', 't-shirt', 'sweater', 'hoodie', 'shoes', 'boots', 'sneakers', 'belt', 'jacket', 'coat'],
  'pants': ['shirt', 't-shirt', 'sweater', 'hoodie', 'jacket', 'coat', 'shoes', 'boots', 'sneakers', 'belt'],
  'jeans': ['shirt', 't-shirt', 'sweater', 'hoodie', 'jacket', 'coat', 'shoes', 'boots', 'sneakers', 'belt'],
  'trousers': ['shirt', 't-shirt', 'sweater', 'hoodie', 'jacket', 'coat', 'shoes', 'boots', 'sneakers', 'belt'],
  'shirt': ['pants', 'jeans', 'trousers', 'shoes', 'boots', 'sneakers', 'jacket', 'coat', 'belt'],
  't-shirt': ['pants', 'jeans', 'trousers', 'shoes', 'boots', 'sneakers', 'jacket', 'coat', 'hoodie'],
  'sweater': ['pants', 'jeans', 'trousers', 'shoes', 'boots', 'sneakers', 'jacket', 'coat'],
  'hoodie': ['pants', 'jeans', 'trousers', 'shoes', 'boots', 'sneakers', 'jacket'],
  'shoes': ['pants', 'jeans', 'trousers', 'socks', 'shirt', 't-shirt'],
  'boots': ['pants', 'jeans', 'trousers', 'socks', 'shirt', 't-shirt', 'jacket'],
  'sneakers': ['pants', 'jeans', 'trousers', 'socks', 'shirt', 't-shirt'],
  'dress': ['shoes', 'boots', 'sneakers', 'bag', 'jacket', 'coat', 'jewelry'],
  'snowboard': ['bindings', 'boots', 'wax', 'bag', 'helmet', 'goggles'],
  'ski': ['boots', 'poles', 'goggles', 'helmet', 'gloves'],
  'watch': ['strap', 'watch box'],
  'sunglasses': ['case', 'cleaning kit'],
  'hat': ['sunglasses', 'scarf'],
  'bag': ['wallet', 'keychain'],
};

/**
 * Rank products by relevance to current product
 */
export function rankProductsByRelevance(
  products: any[],
  currentProduct: any | null,
  limit: number = 5
): any[] {
  if (!currentProduct) {
    // No current product, return popular items
    return products
      .filter(p => p.inStock !== false)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }

  // Score each product
  const scored = products.map(product => {
    let score = 0;
    const reasons: string[] = [];

    // Same product - exclude
    if (product.id === currentProduct.id) {
      return { product, score: -1000, reasons };
    }

    // Complementary category: +200 points (highest priority)
    // Check both category and title for better matching
    const currentCategory = (currentProduct.category || '').toLowerCase();
    const currentTitle = (currentProduct.title || '').toLowerCase();
    const productCategory = (product.category || '').toLowerCase();
    const productTitle = (product.title || '').toLowerCase();

    // Check if current product matches any complementary key
    for (const [key, complements] of Object.entries(COMPLEMENTARY_PRODUCTS)) {
      const isCurrentProduct = currentCategory.includes(key) || currentTitle.includes(key);
      
      if (isCurrentProduct) {
        // Check if product matches any complementary category
        for (const complement of complements) {
          if (productCategory.includes(complement) || productTitle.includes(complement)) {
            score += 200; // High score for complementary items
            reasons.push(`Complementary: ${complement}`);
            break;
          }
        }
      }
    }

    // Same category: -50 points (penalty - we want complementary, not same category)
    if (currentCategory === productCategory && score < 150) {
      score -= 50;
      reasons.push('Same category (avoided)');
    }

    // Shared tags: +12 points per tag
    if (currentProduct.tags && product.tags) {
      const sharedTags = currentProduct.tags.filter((tag: string) =>
        product.tags.includes(tag)
      );
      score += sharedTags.length * 12;
      if (sharedTags.length > 0) {
        reasons.push(`Shared tags: ${sharedTags.join(', ')}`);
      }
    }

    // Similar price range: +25 points
    const priceDiff = Math.abs(product.price - currentProduct.price);
    const priceRatio = priceDiff / currentProduct.price;
    if (priceRatio < 0.3) {
      score += 25;
      reasons.push('Similar price');
    }

    // Same vendor: +20 points
    if (product.vendor && currentProduct.vendor && product.vendor === currentProduct.vendor) {
      score += 20;
      reasons.push('Same brand');
    }

    // In-stock bonus: +40 points
    if (product.inStock !== false) {
      score += 40;
    } else {
      score -= 50; // Penalty for out of stock
    }

    return { product, score, reasons };
  });

  // Sort and return top N
  return scored
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score > 0)
    .slice(0, limit)
    .map(item => item.product);
}

/**
 * Get product limit based on query type
 * @deprecated Use getProductLimitForQuery from semantic-search instead
 */
export function getProductLimit(intentType: string): number {
  const limits: Record<string, number> = {
    search: 10,
    recommendation: 20,
    question: 5,
    comparison: 4,
    general: 8,
  };

  return limits[intentType] || 10;
}

