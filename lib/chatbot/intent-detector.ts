import { logger } from '@/lib/utils/logger';

export interface Intent {
  type: 'search' | 'recommendation' | 'question' | 'ticket_creation' | 'comparison' | 'policy_query';
  confidence: number;
  wantsRecommendations: boolean;
  wantsTicket: boolean;
  ticketStage: 'offer' | 'awaiting_confirmation' | 'create' | null;
  filters: {
    maxPrice?: number;
    minPrice?: number;
    category?: string;
    color?: string[];
    size?: string[];
    brand?: string;
    keywords?: string[];
  };
  queryType: 'order' | 'policy' | 'account' | 'product' | 'general';
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
}

/**
 * Analyze user intent from message using PURE BACKEND LOGIC (no AI calls)
 * This uses rule-based detection to determine user intent without any external API calls
 */
export async function analyzeIntent(
  message: string,
  currentProduct: any | null,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<Intent> {
  // Use ONLY rule-based backend logic for intent detection
  // NO AI/LLM calls for intent analysis - this is pure backend logic
  return fallbackIntentDetection(message, currentProduct, conversationHistory);
}

/**
 * Rule-based intent detection using backend logic (no AI/LLM calls)
 */
function fallbackIntentDetection(
  message: string,
  currentProduct: any | null,
  conversationHistory: Array<{ role: string; content: string }> = []
): Intent {
  const lower = message.toLowerCase().trim();
  
  // Check if user is confirming a ticket creation offer
  // Look at the last assistant message to see if it was offering to create a ticket
  const lastAssistantMessage = conversationHistory
    .filter(m => m.role === 'assistant')
    .slice(-1)[0];
  
  const wasTicketOffer = lastAssistantMessage && (
    lastAssistantMessage.content.toLowerCase().includes('create a support ticket') ||
    lastAssistantMessage.content.toLowerCase().includes('create a ticket') ||
    lastAssistantMessage.content.toLowerCase().includes('support ticket') ||
    lastAssistantMessage.content.toLowerCase().includes('would you like me to do that') ||
    lastAssistantMessage.content.toLowerCase().includes('help you with that') ||
    lastAssistantMessage.content.toLowerCase().includes('can help create')
  );
  
  // Check if user is confirming with "yes", "y", "sure", "ok", "okay"
  const isConfirmation = /^(yes|y|sure|ok|okay|yeah|yep|absolutely|definitely)$/i.test(lower.trim());
  
  // If user confirms after a ticket offer, set ticket stage to 'awaiting_confirmation'
  const isTicketConfirmation = isConfirmation && wasTicketOffer;

  // Greeting patterns - if it's just a greeting, it's a question (not a search)
  const greetingPatterns = [
    /^(hi|hey|hello|hola|howdy)$/,
    /^(hi|hey|hello|hola|howdy)[!.\s]*$/,
    /^(good\s+(morning|afternoon|evening))$/,
  ];
  const isGreeting = greetingPatterns.some(pattern => pattern.test(lower));

  // Current product question patterns - user asking about the current product
  const currentProductPatterns = [
    'tell me more',
    'about this',
    'this product',
    'about the product',
    'more info',
    'more information',
    'details',
    'describe',
    'what is this',
    'what\'s this',
  ];
  const isAskingAboutCurrentProduct = currentProductPatterns.some(pattern => lower.includes(pattern)) && currentProduct !== null;

  // Ticket creation patterns - expanded to catch more cases
  const ticketPatterns = [
    'talk to someone',
    'speak to',
    'human',
    'support',
    'help me',
    'frustrated',
    'not working',
    'issue',
    'problem',
    'complaint',
    'create ticket',
    'create a ticket',
    'want to create',
    'need a ticket',
    'support ticket',
    'talk to agent',
    'speak to agent',
  ];
  const wantsTicket = ticketPatterns.some(pattern => lower.includes(pattern)) || isTicketConfirmation;

  // Search patterns - expanded to catch product queries
  const searchPatterns = [
    'show me', 'find', 'search', 'looking for', 
    'do you have', 'have any', 'any', 'available', 'in stock',
    'buy', 'purchase', 'get', 'looking to buy', 'want to buy',
    'browse', 'see', 'view'
  ];
  const isSearch = searchPatterns.some(pattern => lower.includes(pattern));
  
  // Product query patterns - if user mentions product types/categories, it's likely a search
  const productKeywords = [
    'jacket', 'coat', 'shirt', 'pants', 'jeans', 'shoes', 'boots', 'sneakers',
    'dress', 'sweater', 'hoodie', 't-shirt', 'tshirt', 'belt', 'bag', 'hat', 'scarf',
    'shorts', 'skirt', 'socks', 'underwear', 'bra', 'watch', 'jewelry', 'necklace',
    'ring', 'bracelet', 'earrings', 'sunglasses', 'glasses', 'wallet'
  ];
  const hasProductKeyword = productKeywords.some(keyword => lower.includes(keyword));

  // Recommendation patterns
  const recPatterns = [
    'recommend', 'suggest', 'what should', 'what else', 'similar', 
    'any suggestions', 'matching', 'goes well', 'pair with',
    'complement', 'go with', 'match', 'style with'
  ];
  const wantsRecommendations = recPatterns.some(pattern => lower.includes(pattern));

  // Policy query patterns - expanded to catch more policy-related queries
  const policyPatterns = [
    // Shipping & Delivery
    'shipping', 'delivery', 'ship', 'dispatch', 'tracking', 'track', 'carrier',
    'express shipping', 'standard shipping', 'international shipping',
    'how long', 'when will', 'delivery time', 'shipping time', 'shipping cost',
    'free shipping', 'shipping fee', 'shipping charge',
    
    // Returns & Refunds
    'return policy', 'refund policy', 'return', 'refund', 'exchange', 'exchange policy',
    'can i return', 'how to return', 'return window', 'return item',
    'get refund', 'refund process', 'return shipping', 'restocking fee',
    'damaged item', 'wrong item', 'defective', 'broken',
    
    // Payments & Discounts
    'payment', 'pay', 'payment method', 'payment options', 'accepted payment',
    'discount', 'discount code', 'promo code', 'coupon', 'student discount',
    'klarna', 'clearpay', 'paypal', 'apple pay', 'google pay',
    'buy now pay later', 'pay in 3',
    
    // General Policies
    'policy', 'policies', 'terms', 'terms of service', 'privacy', 'privacy policy',
    'warranty', 'guarantee', 'customer service', 'support policy',
    'holiday returns', 'extended returns', 'return condition',
    
    // Order-related policy questions
    'order processing', 'when will my order', 'order status', 'order tracking',
    'cancel order', 'change order', 'modify order',
  ];
  const isPolicyQuery = policyPatterns.some(pattern => lower.includes(pattern));

  // Extract price filters
  const priceMatch = lower.match(/(?:under|less than|below|max|maximum)\s*\$?(\d+)/);
  const maxPrice = priceMatch ? parseInt(priceMatch[1]) * 100 : undefined; // Convert to cents

  const minPriceMatch = lower.match(/(?:over|more than|above|min|minimum)\s*\$?(\d+)/);
  const minPrice = minPriceMatch ? parseInt(minPriceMatch[1]) * 100 : undefined; // Convert to cents

  // Extract colors
  const colors = [
    'black', 'white', 'blue', 'red', 'green', 'yellow', 'gray', 'grey',
    'brown', 'pink', 'purple', 'orange', 'navy', 'beige', 'tan', 'khaki',
    'olive', 'maroon', 'gold', 'silver', 'cream', 'ivory'
  ];
  const detectedColors = colors.filter(color => lower.includes(color));

  // Extract sizes
  const sizePatterns = [
    'small', 'medium', 'large', 'x-small', 'xs', 's', 'm', 'l', 'xl', 'xxl',
    'size 6', 'size 8', 'size 10', 'size 12', 'size 14'
  ];
  const detectedSizes = sizePatterns.filter(size => lower.includes(size));

  // Determine type - priority order:
  // 1. Ticket creation (highest priority for support)
  // 2. Policy queries (for returns, shipping, etc.)
  // 3. Greeting or current product questions (just questions)
  // 4. Product searches (with filters or product keywords)
  // 5. Recommendations
  // 6. General questions (default)
  let type: Intent['type'] = 'question';
  
  if (wantsTicket || lower.includes('create ticket') || lower.includes('want to create')) {
    type = 'ticket_creation';
  } else if (isPolicyQuery) {
    type = 'policy_query';
  } else if (isGreeting || isAskingAboutCurrentProduct) {
    // Greetings and current product questions are just questions
    type = 'question';
  } else if (wantsRecommendations) {
    type = 'recommendation';
  } else if (isSearch || hasProductKeyword || detectedColors.length > 0 || maxPrice || minPrice) {
    // If user mentions products, search terms, colors, or prices, it's a search
    type = 'search';
  }

  const filters: Intent['filters'] = {
    maxPrice,
    minPrice,
    color: detectedColors.length > 0 ? detectedColors : undefined,
    size: detectedSizes.length > 0 ? detectedSizes : undefined,
    keywords: extractKeywords(message),
  };

  // Only set category filter if user is on a product page AND asking about current product
  if (currentProduct?.category && isAskingAboutCurrentProduct) {
    filters.category = currentProduct.category;
  }

  // Set wantsRecommendations flag
  const shouldWantRecommendations = wantsRecommendations || 
    (type === 'search' && (isSearch || hasProductKeyword));

  // Determine ticket stage
  let ticketStage: Intent['ticketStage'] = null;
  if (isTicketConfirmation) {
    // User confirmed ticket creation - move to awaiting_confirmation stage
    ticketStage = 'awaiting_confirmation';
    type = 'ticket_creation';
  } else if (wantsTicket) {
    // User wants a ticket but hasn't confirmed yet
    ticketStage = 'offer';
    type = 'ticket_creation';
  }

  return {
    type,
    confidence: 0.85, // Higher confidence for rule-based detection
    wantsRecommendations: shouldWantRecommendations,
    wantsTicket: wantsTicket || isTicketConfirmation,
    ticketStage,
    filters,
    queryType: isPolicyQuery ? 'policy' : 'product',
    sentiment: wantsTicket || isTicketConfirmation ? 'frustrated' : 'neutral',
  };
}

/**
 * Extract keywords from message
 */
function extractKeywords(message: string): string[] {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));

  return [...new Set(words)];
}
