import type { Intent } from './intent-detector';
import { loadStorePolicies } from '@/lib/store/policies-loader';

export function buildChatPrompt(
  userMessage: string,
  context: {
    currentProduct: any | null;
    recommendedProducts: any[];
    allProducts?: any[]; // Full product catalog for LLM access
    policies: any;
    brandGuidelines?: any;
    customer: any | null;
    cart: any | null;
    scenarioContext?: any | null;
    isOutfitQuery?: boolean;
  },
  intent: Intent
): string {
  // System prompt - Enhanced with better structure and guidance
  let prompt = `You are a friendly and knowledgeable shopping assistant for an e-commerce fashion store. Your role is to help customers make informed purchasing decisions by:

1. **Product Expertise**: Provide detailed information about products including fit, materials, sizing, styling tips, and care instructions.

2. **Personalized Recommendations**: Suggest complementary products that match well with what the customer is viewing or asking about. When recommending products, focus on quality over quantity - suggest 3-5 highly relevant items.

3. **Fit & Sizing Guidance**: Help customers determine if a product will fit them based on their questions. Ask clarifying questions about their preferences, body type, or intended use when needed.

4. **Style Advice**: Offer styling suggestions and outfit combinations. Explain how products can be worn for different occasions.

5. **Scenario-Based Recommendations**: When customers describe a scenario (e.g., "I need an outfit for a winter wedding", "What should I wear for a job interview?"), recommend appropriate products from the catalog that fit their needs.

6. **Brand Voice**: Be enthusiastic, helpful, and professional. Use a conversational tone while maintaining expertise. Show genuine interest in helping customers find the perfect products.

7. **Context Awareness**: You have access to the current page context and product catalog. Adapt your responses based on whether the customer is browsing the home page or viewing a specific product.

CRITICAL RULES:
- Only mention the current product when it's relevant to the user's question or request
- DO NOT automatically mention what product the user is viewing unless it's directly relevant
- "this product", "it" refers to CURRENT PRODUCT (only use when discussing the product)
- Use ONLY real data from context below - never make up product details
- ONLY recommend products when the user explicitly asks for recommendations (e.g., "recommend", "suggest", "what else", "similar items", "matching items", "do you have", "any", "looking for")
- DO NOT include product recommendations unless explicitly requested
- When recommendations ARE requested, suggest 3-5 items MAX, never list 10+
- Respect budget constraints STRICTLY - if user mentions a price limit, only suggest products within that limit
- Prioritize in-stock items
- Be concise - 2-4 sentences typically, unless detailed explanation is needed
- When answering policy questions, use the exact policies provided below
- Match the brand's tone and voice based on brand guidelines provided
- If brand guidelines are provided, ensure all responses align with the brand's style and values
- Be honest about product limitations or fit concerns
- Focus on value and quality, not just making a sale
- If you don't know something specific, acknowledge it and offer to help in other ways
- ⚠️ PRODUCT RECOMMENDATIONS: When recommending products, mention product names naturally in your response (e.g., "I'd suggest the Sky Blue Cotton Shirt"). Products will be displayed as cards automatically - keep your response brief (1-2 sentences) and let the product cards do the talking. DO NOT create lists or write "AVAILABLE PRODUCTS" - just mention product names in your natural text.

Key Guidelines:
- Keep responses concise but informative (2-4 sentences typically)
- Be honest about product limitations or fit concerns
- Encourage customers to use the virtual try-on feature when relevant
- Focus on value and quality, not just making a sale
- When on the home page, proactively suggest products based on customer queries
- When on a product page, focus on that product but also suggest complementary items when asked

Remember: Your goal is to be a trusted advisor who helps customers feel confident in their purchase decisions.

`;

  // Add context
  prompt += `\n=== CONTEXT ===\n`;

  // Page context awareness
  const pageContext = context.currentProduct ? 'product' : 'home';
  if (pageContext === 'home') {
    prompt += `\nPAGE CONTEXT: The customer is browsing the home page/catalog.\n`;
  } else if (pageContext === 'product' && context.currentProduct) {
    prompt += `\nPAGE CONTEXT: The customer is viewing a specific product page.\n`;
  } else {
    prompt += `\nPAGE CONTEXT: The customer is browsing the store.\n`;
  }
  
  // Always inform AI about product access
  prompt += `\nPRODUCT DATABASE ACCESS:
- You have FULL access to the product inventory database
- You can search, filter, and recommend products based on: color, price, category, size, and other attributes
- When users ask about products (e.g., "do you have", "any blue jacket", "looking for"), you should search the database and provide specific product recommendations
- The full product catalog is provided below when making recommendations
- Always search and provide actual products from the database, never say you don't have access
- When recommending, mention product names naturally in your text - they will be displayed as cards automatically\n`;

  // Only include current product info when it's relevant to the conversation
  // Relevant cases: product questions, recommendations, comparisons, or when user asks about "this product"
  const isProductRelevant = 
    intent.type === 'question' && (userMessage.toLowerCase().includes('this product') || 
                                   userMessage.toLowerCase().includes('it ') || 
                                   userMessage.toLowerCase().includes('the product') ||
                                   userMessage.toLowerCase().includes('price') ||
                                   userMessage.toLowerCase().includes('stock') ||
                                   userMessage.toLowerCase().includes('available')) ||
    intent.type === 'recommendation' ||
    intent.type === 'comparison' ||
    intent.type === 'search' ||
    intent.wantsRecommendations;

  if (context.currentProduct && isProductRelevant) {
    const currentProd = context.currentProduct;
    prompt += `\n=== CURRENT PRODUCT (user is viewing this product) ===\n`;
    prompt += `- ID: ${currentProd.id}\n`;
    prompt += `- Name: ${currentProd.title || currentProd.name}\n`;
    prompt += `- Price: $${(currentProd.price / 100).toFixed(2)}\n`;
    prompt += `- Category: ${currentProd.category || 'N/A'}\n`;
    prompt += `- Type: ${currentProd.type || 'N/A'}\n`;
    prompt += `- Color: ${currentProd.color || currentProd.colors?.[0]?.name || 'N/A'}\n`;
    prompt += `- Description: ${(currentProd.description || '').substring(0, 300)}\n`;
    prompt += `- In Stock: ${currentProd.inStock !== false ? 'Yes' : 'No'}\n`;
    
    // Smart recommendation guidance
    if (intent.type === 'recommendation' || intent.wantsRecommendations) {
      prompt += `\n🎯 SMART RECOMMENDATION RULES FOR THIS PRODUCT:\n`;
      prompt += `- The user is viewing a ${currentProd.category || 'product'} (${currentProd.type || 'item'}) in ${currentProd.color || 'a color'}\n`;
      prompt += `- DO NOT recommend other ${currentProd.category?.toLowerCase() || 'items'} - the user already has this item!\n`;
      prompt += `- Recommend COMPLEMENTARY items that complete an outfit:\n`;
      
      // Provide complementary category suggestions based on current product
      const category = (currentProd.category || '').toLowerCase();
      const type = (currentProd.type || '').toLowerCase();
      
      if (category.includes('pant') || category.includes('trouser') || category.includes('jean') || type.includes('chino')) {
        prompt += `  → Shirts (Formal or Casual), Shoes/Boots/Sneakers, Belts, Jackets/Coats\n`;
      } else if (category.includes('shirt') || type.includes('shirt') || type.includes('t-shirt')) {
        prompt += `  → Pants/Jeans/Chinos, Shoes/Boots/Sneakers, Jackets/Coats, Belts\n`;
      } else if (category.includes('shoe') || category.includes('boot') || category.includes('sneaker')) {
        prompt += `  → Pants/Jeans/Chinos, Shirts, Socks\n`;
      } else if (category.includes('coat') || category.includes('jacket') || category.includes('blazer')) {
        prompt += `  → Shirts, Pants/Jeans/Chinos, Shoes, Belts\n`;
      } else if (category.includes('accessor')) {
        prompt += `  → Complete the outfit with Shirts, Pants, Shoes, Jackets\n`;
      } else {
        prompt += `  → Items from different categories that complement this product\n`;
      }
      
      prompt += `- Consider color coordination - recommend colors that work well with ${currentProd.color || 'the current product color'}\n`;
      prompt += `- Think like a personal stylist - what would complete a great outfit?\n`;
    }
    
    prompt += `\nNOTE: Only mention this product if the user's question is directly about it. Do NOT mention it for general questions, support requests, or policy queries.\n`;
  }

  // Include full product catalog when making recommendations
  // This gives LLM full access to all products for smart recommendations
  const shouldShowFullCatalog = 
    (intent.type === 'recommendation' || intent.wantsRecommendations || intent.type === 'search') &&
    intent.type !== 'ticket_creation' && 
    intent.type !== 'policy_query' &&
    !intent.wantsTicket &&
    context.allProducts && 
    context.allProducts.length > 0;

  if (shouldShowFullCatalog) {
    // Check if this is a scenario-based outfit query
    if (context.isOutfitQuery && context.scenarioContext) {
      const sc = context.scenarioContext;
      prompt += `\n=== COMPLETE OUTFIT RECOMMENDATION ===\n`;
      prompt += `SCENARIO: ${sc.scenario || 'General'}\n`;
      if (sc.budget && sc.budget.max) {
        prompt += `BUDGET: Up to $${(sc.budget.max / 100).toFixed(2)}\n`;
      }
      if (sc.requiredItems && sc.requiredItems.length > 0) {
        prompt += `REQUIRED ITEMS: ${sc.requiredItems.join(', ')}\n`;
      }
      if (sc.preferredColors && sc.preferredColors.length > 0) {
        prompt += `PREFERRED COLORS: ${sc.preferredColors.join(', ')}\n`;
      }
      prompt += `\nCOMPLETE PRODUCT CATALOG (${context.allProducts.length} products available):\n`;
    } else {
      prompt += `\n=== FULL PRODUCT CATALOG (${context.allProducts.length} products available) ===\n`;
      if (context.currentProduct) {
        prompt += `\nYou are recommending complementary products for: ${context.currentProduct.title || context.currentProduct.name} (${context.currentProduct.category}, ${context.currentProduct.type}, ${context.currentProduct.color || 'N/A'})\n`;
        prompt += `⚠️ IMPORTANT: Do NOT recommend products from the same category (${context.currentProduct.category}). Focus on COMPLEMENTARY items!\n`;
      }
    }
    
    // Show all products in catalog for LLM to choose from
    context.allProducts.forEach((p, i) => {
      const sizeInfo = p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0 
        ? `, Sizes: ${p.sizes.join(', ')}` 
        : '';
      const colorInfo = p.color ? `, Color: ${p.color}` : '';
      prompt += `${i + 1}. ID: ${p.id} | ${p.title || p.name} | Category: ${p.category || 'N/A'} | Type: ${p.type || 'N/A'}${colorInfo} | Price: $${(p.price / 100).toFixed(2)}${sizeInfo}${p.inStock === false ? ' [OUT OF STOCK]' : ''}\n`;
    });
    
    // Smart recommendation rules
    prompt += `\n🎯 SMART RECOMMENDATION GUIDELINES:\n`;
    if (context.currentProduct) {
      const currentCat = (context.currentProduct.category || '').toLowerCase();
      const currentType = (context.currentProduct.type || '').toLowerCase();
      const currentColor = (context.currentProduct.color || '').toLowerCase();
      
      prompt += `- Current Product: ${context.currentProduct.title || context.currentProduct.name} (${context.currentProduct.category}, ${context.currentProduct.type})\n`;
      prompt += `- NEVER recommend other ${currentCat} - user already has this!\n`;
      prompt += `- Recommend COMPLEMENTARY items from DIFFERENT categories\n`;
      prompt += `- Consider color coordination with ${currentColor || 'the product color'}\n`;
      prompt += `- Think: "What completes an outfit with this ${currentType || 'item'}?"\n`;
    } else {
      prompt += `- Recommend products that match the user's query\n`;
      prompt += `- Consider category, type, color, and price preferences\n`;
    }
    
    prompt += `- Select 3-5 products that work well together\n`;
    prompt += `- Products will be displayed as cards automatically - keep your text response brief (1-2 sentences)\n`;
    prompt += `- Use EXACT product names from the catalog above (e.g., "Sky Blue Cotton Shirt", "Derby Formal Shoes")\n`;
    prompt += `- Format: "Here are some great options:" then mention the product names naturally in your response\n`;
    prompt += `- The system will automatically extract products you mention by name and display them as cards\n`;
    prompt += `- Example: "I'd recommend pairing these with the Sky Blue Cotton Shirt ($25) and Derby Formal Shoes ($35) for a complete professional look."\n`;
    prompt += `- ⚠️ DO NOT create lists, bullet points, or numbered lists of products in your response\n`;
    prompt += `- ⚠️ DO NOT write "AVAILABLE PRODUCTS" or any section headers - just mention product names naturally in your text\n`;
    prompt += `- ⚠️ DO NOT format products as a list - the cards will display automatically when you mention product names\n`;
  } else if (context.recommendedProducts.length > 0 && 
      intent.type !== 'ticket_creation' && 
      intent.type !== 'policy_query' &&
      !intent.wantsTicket) {
    // Fallback: show filtered products if full catalog not available
    prompt += `\nAVAILABLE PRODUCTS (${context.recommendedProducts.length} relevant products):\n`;
    const productsToShow = context.recommendedProducts.slice(0, 20);
    productsToShow.forEach((p, i) => {
      const sizeInfo = p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0 
        ? `, Sizes: ${p.sizes.join(', ')}` 
        : '';
      prompt += `${i + 1}. ID: ${p.id} | ${p.title || p.name} | Category: ${p.category || 'N/A'} | Type: ${p.type || 'N/A'} | Color: ${p.color || 'N/A'} | Price: $${(p.price / 100).toFixed(2)}${sizeInfo}\n`;
    });
  }

  if (context.customer?.logged_in) {
    prompt += `\nCUSTOMER: Logged in (ID: ${context.customer.id})\n`;
  }

  if (context.cart && context.cart.itemCount > 0) {
    prompt += `\nCART: ${context.cart.itemCount} items, Total: $${(context.cart.totalPrice / 100).toFixed(2)}\n`;
  }

  // Add policies ONLY when user is asking policy-related questions
  // This reduces token usage by not including policies in every request
  const shouldIncludePolicies = 
    intent.type === 'policy_query' || 
    intent.queryType === 'policy' ||
    (intent.type === 'question' && (
      userMessage.toLowerCase().includes('shipping') ||
      userMessage.toLowerCase().includes('delivery') ||
      userMessage.toLowerCase().includes('return') ||
      userMessage.toLowerCase().includes('refund') ||
      userMessage.toLowerCase().includes('exchange') ||
      userMessage.toLowerCase().includes('payment') ||
      userMessage.toLowerCase().includes('discount') ||
      userMessage.toLowerCase().includes('policy') ||
      userMessage.toLowerCase().includes('terms') ||
      userMessage.toLowerCase().includes('privacy') ||
      userMessage.toLowerCase().includes('warranty')
    ));

  if (shouldIncludePolicies) {
    // First, try to use the local store policies file (for demo store)
    // This is the primary source for store policies
    const localPolicies = loadStorePolicies();
    
    if (localPolicies) {
      prompt += `\n=== STORE POLICIES (Use this information to answer policy-related questions) ===\n`;
      prompt += `${localPolicies}\n`;
      prompt += `\n=== END OF STORE POLICIES ===\n`;
    } else if (context.policies) {
      // Fallback to database policies if local file is not available
      prompt += `\n=== STORE POLICIES ===\n`;
      if (context.policies.shippingPolicy) {
        prompt += `\nSHIPPING POLICY: ${context.policies.shippingPolicy}\n`;
      }
      if (context.policies.returnPolicy) {
        prompt += `\nRETURN POLICY: ${context.policies.returnPolicy}\n`;
      }
      if (context.policies.refundPolicy) {
        prompt += `\nREFUND POLICY: ${context.policies.refundPolicy}\n`;
      }
      if (context.policies.privacyPolicy) {
        prompt += `\nPRIVACY POLICY: ${context.policies.privacyPolicy}\n`;
      }
      if (context.policies.termsOfService) {
        prompt += `\nTERMS OF SERVICE: ${context.policies.termsOfService}\n`;
      }
      prompt += `\n=== END OF STORE POLICIES ===\n`;
    }
    
    // Add instruction to use policies when answering
    prompt += `\nIMPORTANT: The user is asking about store policies. Use the policies provided above to give accurate, specific answers. Reference specific sections, timeframes, costs, and conditions from the policies document.\n`;
  } else {
    // Even when not including full policies, let the AI know policies exist
    // This allows the AI to inform users that policies are available
    prompt += `\nNOTE: Store policies are available. If the user asks about shipping, returns, refunds, payments, or other store policies, you can access the complete policy document to provide accurate answers.\n`;
  }

  // Add brand guidelines if available
  if (context.brandGuidelines) {
    if (context.brandGuidelines.aboutBrand) {
      prompt += `\nABOUT THE BRAND: ${context.brandGuidelines.aboutBrand.substring(0, 500)}\n`;
    }
    if (context.brandGuidelines.brandGuidelines) {
      prompt += `\nBRAND GUIDELINES: ${context.brandGuidelines.brandGuidelines.substring(0, 500)}\n`;
    }
  }

  // Ticket creation instructions
  if (intent.wantsTicket) {
    prompt += `\n=== TICKET CREATION MODE ===\n`;
    prompt += `User wants to create a support ticket.\n`;
    prompt += `STAGE: ${intent.ticketStage}\n\n`;

    if (intent.ticketStage === 'offer') {
      prompt += `Ask user: "I can help create a support ticket. Would you like me to do that?"\n`;
    } else if (intent.ticketStage === 'awaiting_confirmation') {
      prompt += `User confirmed they want to create a ticket. Respond with: "Great! I'll help you create a support ticket. Please fill out the form below with the details of your issue."\n`;
      prompt += `IMPORTANT: The ticket form will be shown automatically in the UI. Your response should acknowledge the confirmation and guide the user to fill out the form.\n`;
    } else if (intent.ticketStage === 'create') {
      prompt += `Create ticket now. Use this format:\n`;
      prompt += `__TICKET_CREATE__\n`;
      prompt += `ISSUE: [extract issue from user message]\n`;
      prompt += `CONTEXT: [current product, conversation summary]\n`;
      prompt += `__TICKET_END__\n`;
      prompt += `Then respond: "I've created ticket #[ID]. Our team will contact you within 24 hours."\n`;
    }
  }

  prompt += `\n=== USER MESSAGE ===\n${userMessage}\n`;

  prompt += `\nIMPORTANT: Answer based ONLY on the current user message and the context provided above. Do NOT reference previous conversations or chat history. Each question should be answered independently based on the current context.`;

  // Only mention recommendations in instructions if user asked for them
  if (intent.type === 'recommendation' || intent.wantsRecommendations || intent.type === 'search') {
    if (context.isOutfitQuery && context.scenarioContext) {
      // Scenario-based complete outfit recommendation
      prompt += `\nCOMPLETE OUTFIT RECOMMENDATION INSTRUCTIONS:
- The user is asking for a COMPLETE OUTFIT for the scenario: "${context.scenarioContext.scenario}"
- You have been provided with ${context.recommendedProducts.length} carefully selected items that work together to create a complete outfit
- Explain how these items work together as a cohesive outfit for the ${context.scenarioContext.scenario} scenario
- Mention the total price if budget was specified
- Highlight why each category of item is important for this scenario
- Keep your response to 2-3 sentences explaining the complete look
- DO NOT list individual product names/prices - they will be displayed as cards automatically
- Focus on how the outfit as a whole achieves the desired look for the scenario
- If any required items are missing from the catalog, acknowledge this tactfully`;
    } else if (context.currentProduct) {
      prompt += `\nCRITICAL RECOMMENDATION RULES:
- The user is currently viewing: ${context.currentProduct.title} (${context.currentProduct.category || 'N/A'})
- DO NOT recommend products from the same category (e.g., if viewing a jacket, do NOT recommend another jacket)
- DO recommend COMPLEMENTARY items that complete an outfit (e.g., if viewing a jacket, recommend pants, shoes, shirts, belts, etc.)
- Focus on items that would create a complete, stylish outfit with the current product
- DO NOT create lists, bullet points, or numbered lists in your response
- DO NOT write "AVAILABLE PRODUCTS" or any section headers
- Simply mention product names naturally in 1-2 sentences (e.g., "I'd recommend the Sky Blue Cotton Shirt and Derby Formal Shoes")
- Products will be displayed as cards automatically when you mention their names
- Keep your response to 1-2 sentences maximum - just a natural introduction mentioning product names`;
    } else {
      prompt += `\nProvide a helpful, concise response. Since the user asked for recommendations:
- DO NOT create lists, bullet points, or numbered lists in your response
- DO NOT write "AVAILABLE PRODUCTS" or any section headers
- Simply mention product names naturally in 1-2 sentences
- Products will be displayed as cards automatically when you mention their names
- Provide a brief introduction (1-2 sentences) explaining the recommendations
- If the user specified filters (color, price, category), acknowledge that the recommendations match their criteria`;
    }
  } else if (intent.wantsTicket || intent.type === 'ticket_creation') {
    prompt += `\nProvide a helpful, concise response about creating a support ticket. DO NOT mention any products. DO NOT include product recommendations. Focus ONLY on helping the user create a ticket.`;
  } else {
    prompt += `\nProvide a helpful, concise response. DO NOT include product recommendations unless the user explicitly asked for them. Focus on answering their question directly.`;
  }

  return prompt;
}

