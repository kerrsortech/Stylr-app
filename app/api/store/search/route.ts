import { NextRequest, NextResponse } from 'next/server';
import { getDemoProducts } from '@/lib/store/demo-products';
import type { StoreProduct } from '@/lib/store/store-products';

/**
 * Convert demo product to store product format for consistency
 */
function convertToStoreProduct(demoProduct: any): StoreProduct {
  return {
    id: demoProduct.id,
    name: demoProduct.name || demoProduct.title,
    description: demoProduct.description || '',
    price: demoProduct.price,
    originalPrice: demoProduct.originalPrice,
    category: demoProduct.category,
    images: demoProduct.images || [],
    colors: demoProduct.colors || [],
    sizes: demoProduct.sizes || [],
    inStock: demoProduct.inStock !== false,
    featured: demoProduct.featured || false,
    tags: demoProduct.tags || [],
    vendor: demoProduct.vendor,
    type: demoProduct.type,
  };
}

interface ParsedQuery {
  category?: string;
  type?: string;
  colors: string[];
  maxPrice?: number; // in dollars
  minPrice?: number; // in dollars
  keywords: string[];
}

/**
 * Parse search query using rule-based logic (no AI)
 */
function parseSearchQuery(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  const result: ParsedQuery = {
    colors: [],
    keywords: [],
  };

  // Extract price range
  // "under $100", "less than $50", "below 100"
  const maxPriceMatch = lowerQuery.match(/(?:under|less than|below|max|maximum)\s*\$?\s*(\d+)/);
  if (maxPriceMatch) {
    result.maxPrice = parseInt(maxPriceMatch[1]);
  }

  // "over $50", "more than $30", "above 100"
  const minPriceMatch = lowerQuery.match(/(?:over|more than|above|min|minimum)\s*\$?\s*(\d+)/);
  if (minPriceMatch) {
    result.minPrice = parseInt(minPriceMatch[1]);
  }

  // "between $50 and $100"
  const betweenPriceMatch = lowerQuery.match(/between\s*\$?\s*(\d+)\s*(?:and|to|-)\s*\$?\s*(\d+)/);
  if (betweenPriceMatch) {
    result.minPrice = parseInt(betweenPriceMatch[1]);
    result.maxPrice = parseInt(betweenPriceMatch[2]);
  }

  // Extract category/type
  const categoryPatterns = [
    { pattern: /\b(jacket|coat)s?\b/i, category: 'jacket' },
    { pattern: /\b(shirt|tee|t-shirt|tshirt)s?\b/i, category: 'shirt' },
    { pattern: /\b(pants|trousers|jeans)s?\b/i, category: 'pants' },
    { pattern: /\b(shoe|shoes|sneaker|sneakers|boot|boots)s?\b/i, category: 'shoes' },
    { pattern: /\b(dress|dresses)\b/i, category: 'dress' },
    { pattern: /\b(sweater|hoodie|sweatshirt)s?\b/i, category: 'sweater' },
    { pattern: /\b(bag|handbag|purse)s?\b/i, category: 'bag' },
    { pattern: /\b(watch|watches)\b/i, category: 'watch' },
    { pattern: /\b(sunglass|sunglasses)\b/i, category: 'sunglasses' },
    { pattern: /\b(hat|cap)s?\b/i, category: 'hat' },
    { pattern: /\b(belt)s?\b/i, category: 'belt' },
    { pattern: /\b(scarf|scarves)\b/i, category: 'scarf' },
    { pattern: /\b(shorts)\b/i, category: 'shorts' },
  ];

  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(lowerQuery)) {
      result.category = category;
      break;
    }
  }

  // Extract type modifiers (e.g., "running shoes", "winter jacket")
  if (lowerQuery.includes('running') && result.category === 'shoes') {
    result.type = 'running';
  } else if (lowerQuery.includes('basketball') && result.category === 'shoes') {
    result.type = 'basketball';
  } else if (lowerQuery.includes('winter') || lowerQuery.includes('cold')) {
    result.type = 'winter';
  } else if (lowerQuery.includes('summer') || lowerQuery.includes('warm')) {
    result.type = 'summer';
  } else if (lowerQuery.includes('casual')) {
    result.type = 'casual';
  } else if (lowerQuery.includes('formal')) {
    result.type = 'formal';
  }

  // Extract colors
  const colorPatterns = [
    'red', 'blue', 'black', 'white', 'gray', 'grey', 'green', 
    'yellow', 'orange', 'purple', 'pink', 'brown', 'navy', 
    'beige', 'tan', 'silver', 'gold', 'maroon', 'burgundy'
  ];

  for (const color of colorPatterns) {
    if (lowerQuery.includes(color)) {
      result.colors.push(color);
    }
  }

  // Extract keywords (excluding stop words and price/color terms)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'do', 'does', 'have',
    'has', 'can', 'could', 'should', 'would', 'will', 'under', 'over',
    'less', 'more', 'than', 'between', 'me', 'my', 'you', 'your', 'i',
    'want', 'need', 'looking', 'find', 'show', 'get'
  ]);

  const words = lowerQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !stopWords.has(word) &&
      !/^\d+$/.test(word) && // Not a number
      !colorPatterns.includes(word) // Not a color we already extracted
    );

  result.keywords = [...new Set(words)];

  return result;
}

/**
 * Filter products based on parsed query
 */
function filterProductsByQuery(products: StoreProduct[], query: ParsedQuery): StoreProduct[] {
  let filtered = [...products];

  // Filter by category
  if (query.category) {
    filtered = filtered.filter((p) => {
      const productCategory = (p.category || '').toLowerCase();
      const productName = (p.name || '').toLowerCase();
      const productType = (p.type || '').toLowerCase();
      
      return (
        productCategory.includes(query.category!) ||
        productName.includes(query.category!) ||
        productType.includes(query.category!)
      );
    });
  }

  // Filter by type
  if (query.type) {
    filtered = filtered.filter((p) => {
      const productType = (p.type || '').toLowerCase();
      const productName = (p.name || '').toLowerCase();
      const productDesc = (p.description || '').toLowerCase();
      
      return (
        productType.includes(query.type!) ||
        productName.includes(query.type!) ||
        productDesc.includes(query.type!)
      );
    });
  }

  // Filter by price range
  if (query.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= query.maxPrice!);
  }

  if (query.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= query.minPrice!);
  }

  // Filter by colors
  if (query.colors.length > 0) {
    filtered = filtered.filter((p) => {
      // Check in colors array
      if (p.colors && p.colors.length > 0) {
        const productColorNames = p.colors.map(c => 
          (typeof c === 'string' ? c : c.name || '').toLowerCase()
        );
        
        // Check if any search color matches any product color
        // Use word boundary matching to avoid false matches (e.g., "red" in "multi-color")
        if (query.colors.some(searchColor => 
          productColorNames.some(productColor => {
            // Split color names by common separators (/, -, space, etc.)
            const colorParts = productColor.split(/[\s\/\-]+/);
            return colorParts.some(part => 
              part === searchColor || 
              part.includes(searchColor) && part.startsWith(searchColor)
            );
          })
        )) {
          return true;
        }
      }
      
      // Fallback: check in name and description with word boundaries
      const productText = `${p.name} ${p.description}`.toLowerCase();
      return query.colors.some(color => {
        // Use word boundary regex to match whole words only
        const regex = new RegExp(`\\b${color}\\b`, 'i');
        return regex.test(productText);
      });
    });
  }

  // Filter by keywords (if we still have results or no other filters matched)
  if (query.keywords.length > 0) {
    const keywordFiltered = filtered.filter((p) => {
      const searchText = `${p.name} ${p.description} ${p.category} ${p.type} ${p.tags?.join(' ') || ''}`.toLowerCase();
      return query.keywords.some(keyword => searchText.includes(keyword));
    });
    
    // Only use keyword filter if it found results
    if (keywordFiltered.length > 0) {
      filtered = keywordFiltered;
    }
  }

  return filtered;
}

/**
 * Score products for relevance ranking
 */
function scoreProduct(product: StoreProduct, query: ParsedQuery, originalQuery: string): number {
  let score = 0;
  const lowerQuery = originalQuery.toLowerCase();
  const productText = `${product.name} ${product.description} ${product.category} ${product.type}`.toLowerCase();

  // Exact category match
  if (query.category && product.category?.toLowerCase().includes(query.category)) {
    score += 15;
  }

  // Category in name
  if (query.category && product.name.toLowerCase().includes(query.category)) {
    score += 12;
  }

  // Type match
  if (query.type && product.type?.toLowerCase().includes(query.type)) {
    score += 10;
  }

  // Type in name or description
  if (query.type && (product.name.toLowerCase().includes(query.type) || product.description?.toLowerCase().includes(query.type))) {
    score += 8;
  }

  // Price within range (bonus for being in the sweet spot)
  if (query.maxPrice !== undefined && product.price <= query.maxPrice) {
    score += 5;
    // Bonus if close to max price (within 20%)
    if (product.price >= query.maxPrice * 0.8) {
      score += 3;
    }
  }

  if (query.minPrice !== undefined && product.price >= query.minPrice) {
    score += 5;
  }

  // Color match
  if (query.colors.length > 0) {
    const productColors = product.colors?.map(c => 
      (typeof c === 'string' ? c : c.name || '').toLowerCase()
    ) || [];
    
    const hasColorMatch = query.colors.some(searchColor => 
      productColors.some(pc => pc.includes(searchColor) || searchColor.includes(pc)) ||
      productText.includes(searchColor)
    );
    
    if (hasColorMatch) {
      score += 10;
    }
  }

  // Keyword matches
  if (query.keywords.length > 0) {
    query.keywords.forEach((keyword) => {
      if (product.name.toLowerCase().includes(keyword)) {
        score += 5;
      } else if (productText.includes(keyword)) {
        score += 2;
      }
    });
  }

  // Name contains any part of original query
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  queryWords.forEach(word => {
    if (product.name.toLowerCase().includes(word)) {
      score += 3;
    }
  });

  // Boost featured products slightly
  if (product.featured) {
    score += 2;
  }

  // Boost in-stock products
  if (product.inStock) {
    score += 1;
  }

  return score;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.get('q');

    if (!queryString || !queryString.trim()) {
      return NextResponse.json({
        products: [],
        total: 0,
      });
    }

    console.log('[Search] Query:', queryString);

    // Get demo products
    const demoProducts = await getDemoProducts();
    const storeProducts = demoProducts.map(convertToStoreProduct);

    console.log('[Search] Total products:', storeProducts.length);

    // Parse the query using rule-based logic (no AI)
    const parsedQuery = parseSearchQuery(queryString);
    console.log('[Search] Parsed query:', JSON.stringify(parsedQuery, null, 2));

    // Filter products based on parsed query
    let filteredProducts = filterProductsByQuery(storeProducts, parsedQuery);
    console.log('[Search] Filtered products:', filteredProducts.length);

    // If no results from filtering, try simple keyword search
    if (filteredProducts.length === 0) {
      const lowerQuery = queryString.toLowerCase();
      filteredProducts = storeProducts.filter((p) => {
        const searchText = `${p.name} ${p.description} ${p.category} ${p.type}`.toLowerCase();
        return searchText.includes(lowerQuery);
      });
      console.log('[Search] Fallback keyword search results:', filteredProducts.length);
    }

    // Score and rank products
    const scoredProducts = filteredProducts.map((product) => ({
      product,
      score: scoreProduct(product, parsedQuery, queryString),
    }));

    // Sort by score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    console.log('[Search] Top 5 scores:', scoredProducts.slice(0, 5).map(p => ({ 
      name: p.product.name, 
      score: p.score,
      price: p.product.price 
    })));

    // Return top 12 results
    const results = scoredProducts.slice(0, 12).map(item => item.product);

    return NextResponse.json({
      products: results,
      total: results.length,
      query: parsedQuery, // Return parsed query for debugging
    });
  } catch (error: any) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { error: 'Failed to search products', message: error.message },
      { status: 500 }
    );
  }
}

