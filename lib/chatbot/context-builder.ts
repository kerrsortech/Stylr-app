import type { Intent } from './intent-detector';

export function buildChatPrompt(
  userMessage: string,
  context: {
    currentProduct: any | null;
    recommendedProducts: any[];
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
- Products are available in the AVAILABLE PRODUCTS section below when relevant
- Always search and provide actual products from the database, never say you don't have access
- The catalog contains ${context.recommendedProducts.length > 0 ? 'many' : 'various'} products, but only the most relevant products matching the customer's query are shown in AVAILABLE PRODUCTS\n`;

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
    prompt += `\nCURRENT PRODUCT (user is viewing - only mention if relevant to their question):\n`;
    prompt += `- Name: ${context.currentProduct.title}\n`;
    prompt += `- Price: $${(context.currentProduct.price / 100).toFixed(2)}\n`;
    prompt += `- Category: ${context.currentProduct.category || 'N/A'}\n`;
    prompt += `- Description: ${(context.currentProduct.description || '').substring(0, 200)}\n`;
    prompt += `- In Stock: ${context.currentProduct.inStock !== false ? 'Yes' : 'No'}\n`;
    prompt += `\nNOTE: Only mention this product if the user's question is directly about it. Do NOT mention it for general questions, support requests, or policy queries.\n`;
  }

  // Only include recommended products if user explicitly asked for recommendations
  // NEVER include products for ticket creation or policy queries
  if (context.recommendedProducts.length > 0 && 
      intent.type !== 'ticket_creation' && 
      intent.type !== 'policy_query' &&
      !intent.wantsTicket &&
      (intent.type === 'recommendation' || intent.wantsRecommendations || intent.type === 'search')) {
    
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
      prompt += `\nCOMPLETE OUTFIT PRODUCTS (${context.recommendedProducts.length} items selected to complete the outfit):\n`;
    } else {
      prompt += `\nAVAILABLE PRODUCTS FOR RECOMMENDATIONS (${context.recommendedProducts.length} relevant products matching the customer's query):\n`;
    }
    
    const productsToShow = context.recommendedProducts.slice(0, 20);
    productsToShow.forEach((p, i) => {
      const sizeInfo = p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0 
        ? `, Available Sizes: ${p.sizes.join(', ')}` 
        : '';
      prompt += `- ID: ${p.id}, Name: ${p.title || p.name}, Category: ${p.category || 'N/A'}, Type: ${p.type || 'N/A'}, Color: ${p.color || 'N/A'}, Price: $${(p.price / 100).toFixed(2)}${sizeInfo}${p.inStock === false ? ' [OUT OF STOCK]' : ''}\n`;
    });
    
    // Inform LLM about catalog size for context
    if (productsToShow.length < context.recommendedProducts.length) {
      prompt += `\nNOTE: Only the most relevant ${productsToShow.length} products matching the customer's query are shown above. When recommending products, use only the products listed above.\n`;
    }
  }

  if (context.customer?.logged_in) {
    prompt += `\nCUSTOMER: Logged in (ID: ${context.customer.id})\n`;
  }

  if (context.cart && context.cart.itemCount > 0) {
    prompt += `\nCART: ${context.cart.itemCount} items, Total: $${(context.cart.totalPrice / 100).toFixed(2)}\n`;
  }

  // Add policies if available
  if (context.policies) {
    if (context.policies.shippingPolicy) {
      prompt += `\nSHIPPING POLICY: ${context.policies.shippingPolicy.substring(0, 500)}\n`;
    }
    if (context.policies.returnPolicy) {
      prompt += `\nRETURN POLICY: ${context.policies.returnPolicy.substring(0, 500)}\n`;
    }
    if (context.policies.refundPolicy) {
      prompt += `\nREFUND POLICY: ${context.policies.refundPolicy.substring(0, 500)}\n`;
    }
    if (context.policies.privacyPolicy) {
      prompt += `\nPRIVACY POLICY: ${context.policies.privacyPolicy.substring(0, 500)}\n`;
    }
    if (context.policies.termsOfService) {
      prompt += `\nTERMS OF SERVICE: ${context.policies.termsOfService.substring(0, 500)}\n`;
    }
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
      prompt += `User confirmed. Ask: "Please describe the issue you're experiencing so I can create the ticket."\n`;
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
- DO NOT list product names, prices, or details in your text response - these will be displayed as cards automatically
- Provide a brief introduction explaining how the recommended items complement the current product (e.g., "To perfectly complement your [product name], here are some stylish pieces that would complete your outfit:")
- Keep your response to 1-2 sentences maximum - just an introduction, no product details
- The products from AVAILABLE PRODUCTS will be shown as cards below your message automatically`;
    } else {
      prompt += `\nProvide a helpful, concise response. Since the user asked for recommendations:
- DO NOT list product names, prices, or details in your text response - these will be displayed as cards automatically
- Provide a brief introduction (1-2 sentences) explaining the recommendations
- If the user specified filters (color, price, category), acknowledge that the recommendations match their criteria
- The products from AVAILABLE PRODUCTS will be shown as cards below your message automatically`;
    }
  } else if (intent.wantsTicket || intent.type === 'ticket_creation') {
    prompt += `\nProvide a helpful, concise response about creating a support ticket. DO NOT mention any products. DO NOT include product recommendations. Focus ONLY on helping the user create a ticket.`;
  } else {
    prompt += `\nProvide a helpful, concise response. DO NOT include product recommendations unless the user explicitly asked for them. Focus on answering their question directly.`;
  }

  return prompt;
}

