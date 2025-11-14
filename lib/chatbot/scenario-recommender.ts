import { logger } from '@/lib/utils/logger';

/**
 * Scenario-based outfit recommender
 * Understands user scenarios and recommends complete outfits
 */

export interface ScenarioContext {
  scenario: string | null; // e.g., "interview", "wedding", "casual"
  budget: { min: number | null; max: number | null }; // in cents
  requiredItems: string[]; // e.g., ["blazer", "shirt", "pants", "shoes"]
  preferredColors: string[];
  stylePreferences: string[]; // e.g., "formal", "casual", "sporty"
}

export interface OutfitItem {
  category: string;
  required: boolean;
  priority: number; // 1-5, 5 being highest
  complementaryColors?: string[];
  priceRatio?: number; // What % of budget should this item be?
}

/**
 * Scenario-based outfit templates
 * Defines what items are needed for different scenarios
 */
const SCENARIO_OUTFITS: Record<string, OutfitItem[]> = {
  interview: [
    { category: 'blazer', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.20 },
    { category: 'pants', required: true, priority: 5, priceRatio: 0.25, complementaryColors: ['black', 'navy', 'grey', 'charcoal'] },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.20, complementaryColors: ['black', 'brown'] },
    { category: 'belt', required: false, priority: 2 },
    { category: 'tie', required: false, priority: 2 },
  ],
  'job interview': [
    { category: 'blazer', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.20 },
    { category: 'pants', required: true, priority: 5, priceRatio: 0.25, complementaryColors: ['black', 'navy', 'grey', 'charcoal'] },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.20, complementaryColors: ['black', 'brown'] },
    { category: 'belt', required: false, priority: 2 },
  ],
  wedding: [
    { category: 'suit', required: false, priority: 5, priceRatio: 0.50 },
    { category: 'blazer', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'shirt', required: true, priority: 4, priceRatio: 0.15 },
    { category: 'pants', required: true, priority: 4, priceRatio: 0.25 },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.20 },
    { category: 'tie', required: false, priority: 3 },
    { category: 'watch', required: false, priority: 2 },
  ],
  formal: [
    { category: 'blazer', required: true, priority: 5, priceRatio: 0.40 },
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.20 },
    { category: 'pants', required: true, priority: 5, priceRatio: 0.25 },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.15 },
  ],
  'formal event': [
    { category: 'blazer', required: true, priority: 5, priceRatio: 0.40 },
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.20 },
    { category: 'pants', required: true, priority: 5, priceRatio: 0.25 },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.15 },
  ],
  casual: [
    { category: 't-shirt', required: true, priority: 5, priceRatio: 0.25 },
    { category: 'jeans', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'sneakers', required: true, priority: 4, priceRatio: 0.30 },
    { category: 'jacket', required: false, priority: 3, priceRatio: 0.10 },
  ],
  'casual weekend': [
    { category: 't-shirt', required: true, priority: 5, priceRatio: 0.25 },
    { category: 'jeans', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'sneakers', required: true, priority: 4, priceRatio: 0.30 },
    { category: 'hoodie', required: false, priority: 2 },
  ],
  business: [
    { category: 'blazer', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.20 },
    { category: 'pants', required: true, priority: 5, priceRatio: 0.25 },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.20 },
  ],
  'business casual': [
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'pants', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.25 },
    { category: 'blazer', required: false, priority: 3, priceRatio: 0.10 },
  ],
  date: [
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'jeans', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.25 },
    { category: 'jacket', required: false, priority: 3, priceRatio: 0.15 },
  ],
  party: [
    { category: 'shirt', required: true, priority: 5, priceRatio: 0.35 },
    { category: 'pants', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'shoes', required: true, priority: 4, priceRatio: 0.25 },
    { category: 'jacket', required: false, priority: 3, priceRatio: 0.10 },
  ],
  gym: [
    { category: 't-shirt', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'shorts', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'sneakers', required: true, priority: 4, priceRatio: 0.40 },
  ],
  workout: [
    { category: 't-shirt', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'shorts', required: true, priority: 5, priceRatio: 0.30 },
    { category: 'sneakers', required: true, priority: 4, priceRatio: 0.40 },
  ],
};

/**
 * Extract scenario context from user query
 */
export function extractScenarioContext(query: string): ScenarioContext {
  const lowerQuery = query.toLowerCase();
  
  // Detect scenario
  let scenario: string | null = null;
  for (const scenarioKey of Object.keys(SCENARIO_OUTFITS)) {
    if (lowerQuery.includes(scenarioKey)) {
      scenario = scenarioKey;
      break;
    }
  }
  
  // Extract budget
  const budget = extractBudget(query);
  
  // Extract preferred colors
  const preferredColors = extractColors(query);
  
  // Determine required items based on scenario
  const requiredItems = scenario ? SCENARIO_OUTFITS[scenario]
    .filter(item => item.required)
    .map(item => item.category) : [];
  
  // Extract style preferences
  const stylePreferences = extractStylePreferences(query);
  
  return {
    scenario,
    budget,
    requiredItems,
    preferredColors,
    stylePreferences,
  };
}

/**
 * Extract budget from query
 */
function extractBudget(query: string): { min: number | null; max: number | null } {
  const lowerQuery = query.toLowerCase();
  
  // Try to find budget mentions
  const budgetPattern = /(?:budget|spend|around|up\s+to|max|maximum)\s+(?:of\s+)?(?:\$|usd|dollars?)?\s*(\d+)/i;
  const match = lowerQuery.match(budgetPattern);
  
  if (match) {
    const amount = parseInt(match[1]) * 100; // Convert to cents
    return { min: null, max: amount };
  }
  
  // Try range pattern
  const rangePattern = /(?:between|from)\s+\$?\s*(\d+)\s+(?:and|to|-)\s+\$?\s*(\d+)/i;
  const rangeMatch = lowerQuery.match(rangePattern);
  
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1]) * 100,
      max: parseInt(rangeMatch[2]) * 100,
    };
  }
  
  return { min: null, max: null };
}

/**
 * Extract colors from query
 */
function extractColors(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const colors = [
    'black', 'white', 'blue', 'red', 'green', 'yellow', 'gray', 'grey',
    'brown', 'pink', 'purple', 'orange', 'navy', 'beige', 'tan', 'khaki',
  ];
  
  return colors.filter(color => lowerQuery.includes(color));
}

/**
 * Extract style preferences
 */
function extractStylePreferences(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const styles = ['formal', 'casual', 'sporty', 'elegant', 'trendy', 'classic', 'modern'];
  
  return styles.filter(style => lowerQuery.includes(style));
}

/**
 * Recommend complete outfit based on scenario and budget
 */
export function recommendCompleteOutfit(
  products: any[],
  scenarioContext: ScenarioContext
): {
  items: any[];
  totalPrice: number;
  missingCategories: string[];
} {
  const { scenario, budget, preferredColors } = scenarioContext;
  
  if (!scenario || !SCENARIO_OUTFITS[scenario]) {
    return { items: [], totalPrice: 0, missingCategories: [] };
  }
  
  const outfitTemplate = SCENARIO_OUTFITS[scenario];
  const maxBudget = budget.max || Infinity;
  
  // Sort outfit items by priority (highest first)
  const sortedItems = [...outfitTemplate].sort((a, b) => b.priority - a.priority);
  
  const selectedItems: any[] = [];
  let totalPrice = 0;
  const missingCategories: string[] = [];
  
  // Try to find one item for each category
  for (const outfitItem of sortedItems) {
    const { category, required, priceRatio, complementaryColors } = outfitItem;
    
    // Calculate target price for this item
    const targetPrice = priceRatio && budget.max 
      ? budget.max * priceRatio 
      : undefined;
    
    // Filter products for this category
    let categoryProducts = products.filter(p => {
      const productCategory = (p.category || '').toLowerCase();
      const productTitle = (p.title || '').toLowerCase();
      const productType = (p.type || '').toLowerCase();
      
      return (
        productCategory.includes(category) ||
        productTitle.includes(category) ||
        productType.includes(category)
      ) && p.inStock !== false;
    });
    
    // Filter by complementary colors if specified
    if (complementaryColors && complementaryColors.length > 0) {
      const colorFiltered = categoryProducts.filter(p => {
        const productColor = (p.color || '').toLowerCase();
        return complementaryColors.some(color => productColor.includes(color));
      });
      
      if (colorFiltered.length > 0) {
        categoryProducts = colorFiltered;
      }
    }
    
    // Filter by preferred colors if user specified
    if (preferredColors.length > 0) {
      const colorFiltered = categoryProducts.filter(p => {
        const productColor = (p.color || '').toLowerCase();
        return preferredColors.some(color => productColor.includes(color));
      });
      
      if (colorFiltered.length > 0) {
        categoryProducts = colorFiltered;
      }
    }
    
    // Sort by price proximity to target and select best match
    if (categoryProducts.length > 0) {
      if (targetPrice) {
        categoryProducts.sort((a, b) => {
          const aDiff = Math.abs(a.price - targetPrice);
          const bDiff = Math.abs(b.price - targetPrice);
          return aDiff - bDiff;
        });
      }
      
      // Find item that fits within remaining budget
      const remainingBudget = maxBudget - totalPrice;
      const affordableItem = categoryProducts.find(p => p.price <= remainingBudget);
      
      if (affordableItem) {
        selectedItems.push(affordableItem);
        totalPrice += affordableItem.price;
      } else if (required) {
        missingCategories.push(category);
      }
    } else if (required) {
      missingCategories.push(category);
    }
    
    // Stop if we've exceeded budget
    if (totalPrice > maxBudget) {
      break;
    }
  }
  
  logger.info('Complete outfit recommended', {
    scenario,
    itemCount: selectedItems.length,
    totalPrice,
    missingCategories,
    budget: budget.max,
  });
  
  return {
    items: selectedItems,
    totalPrice,
    missingCategories,
  };
}

/**
 * Check if query is asking for a complete outfit
 */
export function isCompleteOutfitQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  const outfitKeywords = [
    'complete outfit',
    'full outfit',
    'entire outfit',
    'whole outfit',
    'outfit',
    'what to wear',
    'what should i wear',
    'dress me',
    'clothe me',
    'style me',
    'complete look',
  ];
  
  return outfitKeywords.some(keyword => lowerQuery.includes(keyword));
}

