import type { Intent } from './intent-detector';
import { logger } from '@/lib/utils/logger';

export interface FilterCriteria {
  category?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string; // Single size to filter by
  sizes?: string[]; // Multiple sizes to filter by (OR logic)
  keywords?: string[];
}

export interface QueryIntent {
  category: string | null;
  type: string | null;
  colors: string[];
  keywords: string[];
  priceRange: { min: number | null; max: number | null };
  styleKeywords: string[];
  scenario?: string | null; // e.g., "formal event", "casual wear", "winter wedding"
  isPriceQuery: boolean;
  isCategoryQuery: boolean;
  isSizeQuery: boolean;
  size?: string;
  sizes?: string[];
}

export interface ScoredProduct {
  product: any;
  score: number;
  matchReasons: string[];
}

/**
 * Extract query intent using BACKEND LOGIC ONLY (no AI)
 * This is called once per query to understand what the user wants
 */
export async function extractQueryIntent(
  userQuery: string
): Promise<QueryIntent> {
  // Use ONLY backend rule-based logic (no AI/LLM calls)
  return parseQueryIntentFallback(userQuery);
}

/**
 * Fallback intent extraction using simple parsing
 */
function parseQueryIntentFallback(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase();

  // Extract basic attributes using regex
  const categoryMatch = lowerQuery.match(/\b(jacket|coat|shirt|pants|jeans|shoes|boots|sneakers|dress|sweater|hoodie|t-shirt|belt|bag|hat|scarf)\b/i);
  const category = categoryMatch ? categoryMatch[1] : null;

  // Extract price range (use parseFilterQuery for consistency)
  // parseFilterQuery returns prices in cents already
  const filterCriteria = parseFilterQuery(query);
  const priceRange: { min: number | null; max: number | null } = {
    min: filterCriteria.minPrice !== undefined ? filterCriteria.minPrice : null,
    max: filterCriteria.maxPrice !== undefined ? filterCriteria.maxPrice : null,
  };

  // Extract colors (use parseFilterQuery for consistency)
  const detectedColors: string[] = [];
  if (filterCriteria.color) {
    detectedColors.push(filterCriteria.color.toLowerCase());
    // Handle compound colors
    if (filterCriteria.color.toLowerCase().includes('navy') || filterCriteria.color.toLowerCase().includes('dark blue')) {
      detectedColors.push('navy', 'dark blue', 'black', 'blue');
    }
  } else {
    // Fallback: extract colors manually
    const colors = ['blue', 'black', 'red', 'white', 'gray', 'grey', 'green', 'yellow', 'brown', 'pink', 'purple', 'orange', 'navy', 'beige', 'tan'];
    const found = colors.filter(color => lowerQuery.includes(color));
    detectedColors.push(...found);
    
    // Handle compound colors
    if (lowerQuery.includes('black') && lowerQuery.includes('blue')) {
      if (!detectedColors.includes('navy')) detectedColors.push('navy');
      if (!detectedColors.includes('dark blue')) detectedColors.push('dark blue');
    }
  }

  // Extract keywords (use from filterCriteria if available, otherwise extract)
  const keywords = filterCriteria.keywords || (() => {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'you', 'your', 'i', 'me', 'my', 'we', 'our', 'can', 'could', 'would', 'should', 'want', 'need', 'get', 'got', 'show', 'find', 'search', 'looking', 'for', 'any', 'some', 'this', 'that', 'these', 'those']);
    const words = query.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
    return words.slice(0, 10); // Limit to 10 keywords
  })();

  // Extract style keywords
  const styleKeywords = ['casual', 'formal', 'sporty', 'elegant', 'trendy', 'classic', 'modern', 'vintage'].filter(style => lowerQuery.includes(style));

  // Extract scenario
  let scenario: string | null = null;
  if (lowerQuery.includes('wedding')) scenario = 'wedding';
  else if (lowerQuery.includes('interview') || lowerQuery.includes('job')) scenario = 'job interview';
  else if (lowerQuery.includes('casual') || lowerQuery.includes('weekend')) scenario = 'casual wear';
  else if (lowerQuery.includes('formal') || lowerQuery.includes('business')) scenario = 'formal event';
  else if (lowerQuery.includes('winter') || lowerQuery.includes('cold')) scenario = 'winter';
  else if (lowerQuery.includes('summer') || lowerQuery.includes('hot')) scenario = 'summer';

  return {
    category,
    type: null,
    colors: detectedColors,
    keywords,
    priceRange,
    styleKeywords,
    scenario,
    isPriceQuery: !!(filterCriteria.minPrice || filterCriteria.maxPrice) || /(under|below|less than|over|above|more than|between|price|budget|cost)/i.test(query),
    isCategoryQuery: !!(filterCriteria.category || filterCriteria.type) || /(jacket|coat|shirt|pants|jeans|shoes|boots|sneakers|dress|sweater|hoodie|belt|bag|hat)/i.test(query),
    isSizeQuery: !!filterCriteria.size || /\b(S|M|L|XL|XXL|\d{1,2})\b/i.test(query),
    size: filterCriteria.size,
    sizes: filterCriteria.sizes,
  };
}

/**
 * Filters products based on given criteria
 */
function filterProducts(products: any[], criteria: FilterCriteria): any[] {
  let filtered = [...products];

  // Filter by category
  if (criteria.category) {
    filtered = filtered.filter((p) => {
      const productCategory = (p.category || '').toLowerCase();
      return productCategory.includes(criteria.category!.toLowerCase());
    });
  }

  // Filter by type (use includes for partial matching)
  if (criteria.type) {
    filtered = filtered.filter((p) => {
      const productType = (p.type || '').toLowerCase();
      return productType.includes(criteria.type!.toLowerCase());
    });
  }

  // Filter by price range
  if (criteria.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= criteria.minPrice!);
  }

  if (criteria.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= criteria.maxPrice!);
  }

  // Filter by color (improved to handle compound colors like "Black/White" or "Multi-Color")
  if (criteria.color) {
    filtered = filtered.filter((p) => {
      if (!p.color) return false;
      const productColors = p.color.toLowerCase().split(/[\/\s,]+/);
      const searchColor = criteria.color!.toLowerCase();
      // Check if any part of the product color matches the search color
      return (
        productColors.some((c: string) => c.includes(searchColor)) ||
        p.color.toLowerCase().includes(searchColor)
      );
    });
  }

  // Filter by size
  if (criteria.size || (criteria.sizes && criteria.sizes.length > 0)) {
    const sizesToMatch = criteria.size ? [criteria.size] : criteria.sizes || [];
    filtered = filtered.filter((p) => {
      // If product has no sizes, it doesn't match size filter
      if (!p.sizes || (Array.isArray(p.sizes) && p.sizes.length === 0)) {
        // If no size filter is critical, skip this filter
        return true; // Don't exclude products without size info
      }
      
      const productSizes = Array.isArray(p.sizes) ? p.sizes : [p.sizes];
      // Check if any of the requested sizes match any available sizes (case-insensitive)
      return sizesToMatch.some((searchSize) =>
        productSizes.some((productSize: any) => 
          String(productSize).toLowerCase() === String(searchSize).toLowerCase()
        ),
      );
    });
  }

  // Filter by keywords (searches in name, description, category, type)
  if (criteria.keywords && criteria.keywords.length > 0) {
    filtered = filtered.filter((p) => {
      const searchText = `${p.title || ''} ${p.description || ''} ${p.category || ''} ${p.type || ''} ${p.color || ''}`.toLowerCase();
      return criteria.keywords!.some((keyword) => searchText.includes(keyword.toLowerCase()));
    });
  }

  return filtered;
}

/**
 * Extracts filter criteria from natural language query
 * Enhanced parser with better price, category, type, color, and size extraction
 */
function parseFilterQuery(query: string): FilterCriteria {
  const criteria: FilterCriteria = {};
  const lowerQuery = query.toLowerCase();

  // Extract price filters (handle pounds, dollars, etc.)
  const pricePatterns = [
    { pattern: /(?:less than|under|below|maximum|max|up to|<\s*)\s*(\d+)\s*(pounds?|£|gbp)/i, multiplier: 100 },
    { pattern: /(?:less than|under|below|maximum|max|up to|<\s*)\s*\$?\s*(\d+)/i, multiplier: 100 },
  ];
  
  for (const { pattern, multiplier } of pricePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      criteria.maxPrice = parseInt(match[1]) * multiplier;
      break;
    }
  }

  const minPricePatterns = [
    { pattern: /(?:more than|over|above|minimum|min|>\s*)\s*(\d+)\s*(pounds?|£|gbp)/i, multiplier: 100 },
    { pattern: /(?:more than|over|above|minimum|min|>\s*)\s*\$?\s*(\d+)/i, multiplier: 100 },
  ];
  
  for (const { pattern, multiplier } of minPricePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      criteria.minPrice = parseInt(match[1]) * multiplier;
      break;
    }
  }

  const betweenPriceMatch = lowerQuery.match(/(?:between|from)\s*\$?\s*(\d+)\s*(?:and|to|-)\s*\$?\s*(\d+)/i);
  if (betweenPriceMatch) {
    criteria.minPrice = parseInt(betweenPriceMatch[1]) * 100;
    criteria.maxPrice = parseInt(betweenPriceMatch[2]) * 100;
  }

  // Extract category keywords
  const categories = [
    "accessories", "clothing", "footwear", "sunglasses", "watch", "handbag",
    "shoes", "jacket", "coat", "shirt", "pants", "jeans", "trousers",
    "shorts", "jersey", "dress", "sweater", "hoodie", "t-shirt", "belt", "bag", "hat", "scarf"
  ];
  
  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      if (cat === "accessories") {
        criteria.category = "Accessories";
      } else if (cat === "clothing") {
        criteria.category = "Clothing";
      } else if (cat === "footwear" || cat === "shoes") {
        criteria.category = "Footwear";
      } else if (["sunglasses", "watch", "handbag"].includes(cat)) {
        criteria.type = cat.charAt(0).toUpperCase() + cat.slice(1);
      } else {
        // Use as category hint
        criteria.category = cat;
      }
      break;
    }
  }

  // Extract type keywords
  const typeMappings: Record<string, string[]> = {
    sunglasses: ["sunglasses"],
    watch: ["watch"],
    handbag: ["handbag", "bag", "tote"],
    shoes: ["shoes", "sneakers", "cleats", "boots", "footwear"],
    jacket: ["jacket", "coat"],
    shorts: ["shorts"],
    jersey: ["jersey"],
    shirt: ["shirt", "t-shirt", "tshirt"],
    pants: ["pants", "trousers"],
    jeans: ["jeans"],
    dress: ["dress"],
    sweater: ["sweater"],
    hoodie: ["hoodie"],
  };

  for (const [key, variations] of Object.entries(typeMappings)) {
    if (variations.some((v) => lowerQuery.includes(v)) && !criteria.type) {
      if (key === "shoes") {
        criteria.category = "Footwear";
      } else {
        criteria.type = key.charAt(0).toUpperCase() + key.slice(1);
        if (key === "sunglasses") criteria.type = "Sunglasses";
        if (key === "t-shirt") criteria.type = "T-Shirt";
      }
      break;
    }
  }

  // Extract color (improved to handle compound colors)
  const colors = [
    "black", "white", "brown", "tan", "silver", "gold", "red", "blue", "green",
    "gray", "grey", "navy", "beige", "orange", "yellow", "pink", "purple",
    "dark blue", "light blue"
  ];
  
  for (const color of colors) {
    if (lowerQuery.includes(color)) {
      criteria.color = color.charAt(0).toUpperCase() + color.slice(1);
      break;
    }
  }
  
  // Handle compound colors like "black blue"
  if (lowerQuery.includes('black') && lowerQuery.includes('blue')) {
    criteria.color = 'Navy';
  }

  // Extract size (clothing sizes: S, M, L, XL, XXL and shoe sizes: numbers)
  const clothingSizeMatch = lowerQuery.match(
    /\b(size|sizes|in size|available in)\s*(?::)?\s*(S|M|L|XL|XXL|XXXL)\b/i,
  );
  if (clothingSizeMatch) {
    criteria.size = clothingSizeMatch[2].toUpperCase();
  } else {
    // Try direct size mentions
    const directSizeMatch = lowerQuery.match(/\b(S|M|L|XL|XXL|XXXL|XS|SM|MD|LG)\b/i);
    if (directSizeMatch) {
      criteria.size = directSizeMatch[1].toUpperCase();
    }
  }

  // Match shoe sizes (US sizes typically 4-15)
  if (!criteria.size) {
    const shoeSizeMatch = lowerQuery.match(/\b(size|sizes|in size|available in)\s*(?::)?\s*(\d{1,2})\b/i);
    if (shoeSizeMatch) {
      const sizeNum = parseInt(shoeSizeMatch[2]);
      if (sizeNum >= 4 && sizeNum <= 15) {
        criteria.size = sizeNum.toString();
      }
    } else {
      // Try direct number mentions that could be shoe sizes
      const directShoeSizeMatch = lowerQuery.match(/\b([4-9]|1[0-5])\b/);
      if (directShoeSizeMatch && !criteria.maxPrice && !criteria.minPrice) {
        // Additional check: if query mentions footwear/shoes, likely a size
        if (
          lowerQuery.includes("shoe") ||
          lowerQuery.includes("sneaker") ||
          lowerQuery.includes("cleat") ||
          lowerQuery.includes("footwear") ||
          lowerQuery.includes("boot")
        ) {
          const potentialSize = parseInt(directShoeSizeMatch[1]);
          criteria.size = potentialSize.toString();
        }
      }
    }
  }

  return criteria;
}

/**
 * Smart filter that uses both parsing and keyword extraction
 */
function smartFilterProducts(products: any[], query: string): any[] {
  const criteria = parseFilterQuery(query);

  // If we didn't extract much, try keyword-based search
  if (!criteria.category && !criteria.type && !criteria.maxPrice && !criteria.minPrice && !criteria.color && !criteria.size) {
    // Extract potential keywords from query
    const stopWords = new Set([
      "show", "me", "give", "can", "you", "i", "want", "need", "find", "looking",
      "for", "which", "what", "are", "is", "the", "a", "an", "less", "than",
      "under", "below", "over", "above", "between", "and", "or", "with", "in",
      "do", "have", "any", "available", "get", "buy", "purchase"
    ]);
    
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .filter((w) => !/^\$?\d+$/.test(w)); // Remove numbers/price strings

    if (words.length > 0) {
      criteria.keywords = words;
    }
  }

  return filterProducts(products, criteria);
}

/**
 * Scores products based on relevance to query intent
 */
function scoreProduct(
  product: any,
  intent: QueryIntent,
  originalQuery: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const lowerQuery = originalQuery.toLowerCase();
  const productText = `${product.title || ''} ${product.description || ''} ${product.category || ''} ${product.type || ''} ${product.color || ''}`.toLowerCase();

  // Category match: +10 points
  if (intent.category && product.category?.toLowerCase().includes(intent.category.toLowerCase())) {
    score += 10;
    reasons.push('Category match');
  }

  // Type match: +10 points
  if (intent.type && product.type?.toLowerCase().includes(intent.type.toLowerCase())) {
    score += 10;
    reasons.push('Type match');
  }

  // Color match: +5 points per color
  if (intent.colors.length > 0) {
    const productColors = `${product.color || ''} ${product.title || ''} ${product.description || ''}`.toLowerCase();
    for (const color of intent.colors) {
      const colorLower = color.toLowerCase();
      if (productColors.includes(colorLower)) {
        score += 5;
        reasons.push(`Color: ${color}`);
        break; // Only count once per product
      }
    }
    
    // Handle compound colors
    if (intent.colors.length > 1) {
      const hasBlack = intent.colors.some(c => c.toLowerCase().includes('black'));
      const hasBlue = intent.colors.some(c => c.toLowerCase().includes('blue'));
      if (hasBlack && hasBlue) {
        if (productColors.includes('navy') || productColors.includes('dark blue')) {
          score += 8;
          reasons.push('Color: black-blue/navy');
        }
      }
    }
  }

  // Keyword match: +3 points per keyword
  if (intent.keywords.length > 0) {
  for (const keyword of intent.keywords) {
    if (productText.includes(keyword.toLowerCase())) {
      score += 3;
      reasons.push(`Keyword: ${keyword}`);
      }
    }
  }

  // Price range match: +5 points for within range, +3 bonus if in middle
  if (intent.priceRange) {
  if (intent.priceRange.max !== null && product.price <= intent.priceRange.max) {
    score += 5;
      reasons.push('Within max budget');
    }
    if (intent.priceRange.min !== null && product.price >= intent.priceRange.min) {
      score += 5;
      reasons.push('Within min budget');
    }
    // Bonus if price is in the middle of range
    if (intent.priceRange.min !== null && intent.priceRange.max !== null) {
      if (product.price >= intent.priceRange.min && product.price <= intent.priceRange.max) {
        score += 3;
        reasons.push('Price in range');
      }
    }
  }

  // Scenario-based matching: +5 points
  if (intent.scenario) {
    const scenario = intent.scenario.toLowerCase();
    if (scenario.includes('formal') && (product.category?.toLowerCase().includes('clothing') || product.type?.toLowerCase().includes('suit') || product.type?.toLowerCase().includes('dress'))) {
      score += 5;
      reasons.push('Scenario: formal');
    }
    if (scenario.includes('casual') && (product.category?.toLowerCase().includes('clothing') || product.type?.toLowerCase().includes('t-shirt') || product.type?.toLowerCase().includes('jeans'))) {
      score += 5;
      reasons.push('Scenario: casual');
    }
    if (scenario.includes('winter') && (product.category?.toLowerCase().includes('clothing') || product.type?.toLowerCase().includes('jacket') || product.type?.toLowerCase().includes('coat'))) {
      score += 5;
      reasons.push('Scenario: winter');
    }
    if (scenario.includes('summer') && (product.category?.toLowerCase().includes('clothing') || product.type?.toLowerCase().includes('t-shirt') || product.type?.toLowerCase().includes('shorts'))) {
      score += 5;
      reasons.push('Scenario: summer');
    }
  }

  // Query keyword match in product name: +8 points (highest priority)
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'you', 'your', 'i', 'me', 'my', 'we', 'our', 'can', 'could', 'would', 'should', 'want', 'need', 'get', 'got', 'show', 'find', 'search', 'looking', 'for', 'any', 'some', 'this', 'that', 'these', 'those']);
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  for (const word of queryWords) {
    if (product.title?.toLowerCase().includes(word)) {
      score += 8;
      reasons.push(`Title match: ${word}`);
    }
  }

  // Style keywords match: +3 points
  if (intent.styleKeywords.length > 0) {
    for (const style of intent.styleKeywords) {
      if (productText.includes(style.toLowerCase())) {
        score += 3;
        reasons.push(`Style: ${style}`);
      }
    }
  }

  // Size match: +5 points
  if (intent.size || (intent.sizes && intent.sizes.length > 0)) {
    const sizesToMatch = intent.size ? [intent.size] : intent.sizes || [];
    if (product.sizes) {
      const productSizes = Array.isArray(product.sizes) ? product.sizes : [product.sizes];
      const hasMatchingSize = sizesToMatch.some((searchSize) =>
        productSizes.some((productSize: any) =>
          String(productSize).toLowerCase() === String(searchSize).toLowerCase()
        )
      );
      if (hasMatchingSize) {
        score += 5;
        reasons.push(`Size match: ${sizesToMatch.join(', ')}`);
      }
    }
  }

  // In stock bonus: +2 points
  if (product.inStock !== false) {
    score += 2;
  } else {
    score -= 10; // Penalty for out of stock
  }

  return { score, reasons };
}

/**
 * Determines how many products to return based on query type
 */
export function getProductLimitForQuery(intent: Intent, catalogSize: number): number {
  // For search queries, return fewer products (user wants specific results)
  if (intent.type === 'search') {
    return Math.min(10, catalogSize);
  }

  // For recommendations, return more products (user wants variety)
  if (intent.type === 'recommendation') {
    return Math.min(20, catalogSize);
  }

  // For questions, return fewer products (user wants information)
  if (intent.type === 'question') {
    return Math.min(5, catalogSize);
  }

  // For comparisons, return 2-4 products
  if (intent.type === 'comparison') {
    return Math.min(4, catalogSize);
  }

  // Default
  return Math.min(15, catalogSize);
}

/**
 * Filter and rank products semantically
 * This is the main function to use for product retrieval
 */
export async function semanticProductSearch(
  products: any[],
  userQuery: string,
  intent: Intent,
  maxProducts: number = 10
): Promise<ScoredProduct[]> {
  // Extract query intent once (used for scoring)
  const queryIntent = await extractQueryIntent(userQuery);
  
  // If catalog is small (< 50), return all (or up to maxProducts)
  if (products.length <= 50) {
    const scored = products.map(product => {
      const { score, reasons } = scoreProduct(product, queryIntent, userQuery);
      return { product, score, matchReasons: reasons };
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxProducts);
  }

  // First, use smart filter to narrow down products
  let filteredProducts = smartFilterProducts(products, userQuery);

  // If smart filter returns too many, score and rank them
  if (filteredProducts.length > maxProducts) {
    // Score each product
    const scoredProducts = filteredProducts.map(product => {
      const { score, reasons } = scoreProduct(product, queryIntent, userQuery);
      return { product, score, matchReasons: reasons };
    });

    // Sort by score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    // Return top N
    return scoredProducts.slice(0, maxProducts);
  }

  // If filtered results are within limit, score and return them
  if (filteredProducts.length > 0) {
    const scored = filteredProducts.map(product => {
      const { score, reasons } = scoreProduct(product, queryIntent, userQuery);
      return { product, score, matchReasons: reasons };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxProducts);
  }

  // If no filtered results but we have keywords, try keyword matching
  if (queryIntent.keywords.length > 0) {
    const keywordMatches = products.filter(product => {
      const productText = `${product.title || ''} ${product.description || ''} ${product.category || ''} ${product.type || ''}`.toLowerCase();
      return queryIntent.keywords.some(keyword => productText.includes(keyword.toLowerCase()));
    });

    if (keywordMatches.length > 0) {
      // Score and rank
      const scored = keywordMatches.map(product => {
        const { score, reasons } = scoreProduct(product, queryIntent, userQuery);
        return { product, score, matchReasons: reasons };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, maxProducts);
    }
  }

  // Fallback: return top N by score (even if low scores)
  const scored = products.map(product => {
    const { score, reasons } = scoreProduct(product, queryIntent, userQuery);
    return { product, score, matchReasons: reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxProducts);
}
