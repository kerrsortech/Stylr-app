import { NextRequest, NextResponse } from 'next/server';
import { analyzeIntent } from '@/lib/chatbot/intent-detector';
import { buildChatPrompt } from '@/lib/chatbot/context-builder';
import { extractProductsFromResponse } from '@/lib/chatbot/product-extractor';
import { semanticProductSearch, getProductLimitForQuery } from '@/lib/chatbot/semantic-search';
import { rankProductsByRelevance } from '@/lib/chatbot/product-ranker';
import { extractScenarioContext, recommendCompleteOutfit, isCompleteOutfitQuery } from '@/lib/chatbot/scenario-recommender';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { getSession, addMessage, updateSessionActivity, setSession, Session, getConversation } from '@/lib/cache/session-manager';
import { rateLimitMiddleware } from '@/lib/utils/rate-limiter';
import { handleApiError, createServerError } from '@/lib/utils/error-handler';
import { createTicket, extractTicketInfo } from '@/lib/chatbot/ticket-handler';
import { getProductCatalog, saveConversation, getShopPolicies, getBrandGuidelines } from '@/lib/database/queries';
import { canSendChat, incrementChatOutputUsage, getOrganizationByShopDomain } from '@/lib/database/organization-queries';
import { fetchUserDetails } from '@/lib/integrations/auth-integration';
import { db } from '@/lib/database/db';
import { sessions } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { getAllProducts as getDemoProducts } from '@/lib/store/demo-products';

const RequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(1000),
  context: z.object({
    currentProduct: z.any().optional().nullable(),
    shopDomain: z.string().min(1),
    customerId: z.string().optional(),
    customerEmail: z.string().email().optional(),
  }),
});

/**
 * Transform demo products to match the expected format
 * Demo products have: name (not title), price in dollars (not cents)
 */
function transformDemoProducts(demoProducts: any[]): any[] {
  return demoProducts.map(p => ({
    id: p.id,
    title: p.name, // Convert name to title
    name: p.name,
    description: p.description,
    price: p.price * 100, // Convert dollars to cents
    category: p.category,
    type: p.type,
    color: p.color,
    sizes: p.sizes || [],
    tags: [], // Demo products don't have tags
    images: p.images || [],
    image: p.images?.[0] || null, // First image as main image
    imageUrl: p.images?.[0] || null,
    thumbnail: p.images?.[0] || null,
    inStock: true, // All demo products are in stock
    vendor: 'Demo Store',
    metadata: {},
  }));
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware({
      maxRequests: 50,
      windowMs: 60000,
    })(req);
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate request
    const body = await req.json();
    const { sessionId, message, context } = RequestSchema.parse(body);

    // Fetch and store user data if customerId or customerEmail is provided
    if (context.customerId || context.customerEmail) {
      try {
        const userDetails = await fetchUserDetails(
          context.shopDomain,
          context.customerId,
          context.customerEmail
        );

        if (userDetails) {
          // Update session in database with user details
          await db
            .update(sessions)
            .set({
              customerId: userDetails.id,
              customerEmail: userDetails.email,
              customerName: userDetails.name || null,
              lastActivityAt: new Date(),
            })
            .where(eq(sessions.sessionId, sessionId));

          logger.info('User details stored in session', {
            sessionId,
            customerId: userDetails.id,
            email: userDetails.email,
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch or store user details', { error });
        // Don't fail the request if user details fetch fails
      }
    }

    // OPTIMIZATION: Parallelize independent operations
    // 1. Get organization and session in parallel
    // 2. Get conversation history and check usage limits in parallel
    // 3. Get product catalog, policies, and brand guidelines in parallel
    
    const [org, existingSessionResult, canChatResult] = await Promise.all([
      getOrganizationByShopDomain(context.shopDomain),
      db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1),
      canSendChat(context.shopDomain),
    ]);

    if (!org) {
      return NextResponse.json(
        {
          error: 'Organization not found for this shop domain',
          code: 'ORGANIZATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (!canChatResult) {
      return NextResponse.json(
        {
          error: 'Monthly chat limit reached. Please upgrade your plan or contact support.',
          code: 'USAGE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    const [existingSession] = existingSessionResult;

    // Determine customerId - prioritize from context, then from existing session
    let customerId = context.customerId || existingSession?.customerId || null;
    
    if (context.customerId && existingSession && existingSession.customerId !== context.customerId) {
      customerId = context.customerId;
    }

    // Update/create session in database (non-blocking for response)
    const sessionUpdatePromise = (async () => {
      try {
        if (!existingSession) {
          await db.insert(sessions).values({
            sessionId,
            shopDomain: context.shopDomain,
            organizationName: org.organizationName || 'Unknown',
            customerId: customerId || null,
            customerEmail: context.customerEmail || null,
            lastActivityAt: new Date(),
          });
        } else {
          await db
            .update(sessions)
            .set({
              lastActivityAt: new Date(),
              shopDomain: context.shopDomain,
              organizationName: org.organizationName || existingSession.organizationName || 'Unknown',
              ...(customerId && { customerId: customerId }),
              ...(context.customerEmail && { customerEmail: context.customerEmail }),
            })
            .where(eq(sessions.sessionId, sessionId));
        }
      } catch (dbError: any) {
        logger.warn('Failed to update session in database', {
          error: dbError.message,
          sessionId,
        });
      }
    })();

    // Update Redis session (non-blocking)
    const redisUpdatePromise = Promise.all([
      updateSessionActivity(sessionId).catch(() => {}),
      (async (): Promise<Session> => {
        try {
          let session = await getSession(sessionId);
          if (!session) {
            const newSession: Session = {
              sessionId,
              shopDomain: context.shopDomain,
              customerId: customerId,
              currentPage: {
                type: context.currentProduct ? 'product' : 'home',
                productId: context.currentProduct?.id || null,
              },
              cart: { itemCount: 0, totalPrice: 0 },
              metadata: {},
            };
            await setSession(newSession);
            return newSession;
          } else if (customerId && session.customerId !== customerId) {
            session.customerId = customerId;
            await setSession(session);
          }
          return session;
        } catch (redisError: any) {
          logger.warn('Redis session error', { error: redisError.message, sessionId });
          const fallback: Session = {
            sessionId,
            shopDomain: context.shopDomain,
            customerId: customerId,
            currentPage: { 
              type: context.currentProduct ? 'product' : 'home', 
              productId: context.currentProduct?.id || null 
            },
            cart: { itemCount: 0, totalPrice: 0 },
            metadata: {},
          };
          return fallback;
        }
      })(),
    ]);

    // Log current product context for debugging
    logger.info('Chat request received', {
      sessionId,
      message: message.substring(0, 100),
      hasCurrentProduct: !!context.currentProduct,
      currentProductId: context.currentProduct?.id,
      currentProductTitle: context.currentProduct?.title || context.currentProduct?.name,
      currentProductImage: context.currentProduct?.image,
      shopDomain: context.shopDomain,
    });

    // Get conversation history for intent detection
    const conversationHistory = await getConversation(sessionId).catch(() => []);

    // Analyze intent using BACKEND LOGIC ONLY (no AI/LLM calls)
    const intent = await analyzeIntent(message, context.currentProduct || null, conversationHistory);
    
    logger.info('Intent detected (backend logic)', {
      message: message.substring(0, 100),
      intentType: intent.type,
      wantsRecommendations: intent.wantsRecommendations,
      wantsTicket: intent.wantsTicket,
      filters: intent.filters,
      confidence: intent.confidence,
      hasCurrentProduct: !!context.currentProduct,
    });

    // Get session - second element from Promise.all is the session
    const [, sessionResult] = await redisUpdatePromise;
    const fallbackSession: Session = {
      sessionId,
      shopDomain: context.shopDomain,
      customerId,
      currentPage: { 
        type: context.currentProduct ? 'product' : 'home', 
        productId: context.currentProduct?.id || null 
      },
      cart: { itemCount: 0, totalPrice: 0 },
      metadata: {},
    };
    const session: Session = sessionResult || fallbackSession;

    // Fetch all necessary data in parallel
    // FOR DEMO: Use curated demo products instead of database
    // OPTIMIZATION: Only fetch policies if intent suggests policy-related query
    // This reduces unnecessary database calls and token usage
    const shouldFetchPolicies = 
      intent.type === 'policy_query' || 
      intent.queryType === 'policy' ||
      (intent.type === 'question' && (
        message.toLowerCase().includes('shipping') ||
        message.toLowerCase().includes('delivery') ||
        message.toLowerCase().includes('return') ||
        message.toLowerCase().includes('refund') ||
        message.toLowerCase().includes('exchange') ||
        message.toLowerCase().includes('payment') ||
        message.toLowerCase().includes('discount') ||
        message.toLowerCase().includes('policy') ||
        message.toLowerCase().includes('terms') ||
        message.toLowerCase().includes('privacy')
      ));
    
    const [allProducts, policies, brandGuidelines] = await Promise.all([
      Promise.resolve(transformDemoProducts(getDemoProducts())), // Use demo products
      shouldFetchPolicies 
        ? getShopPolicies(context.shopDomain).catch(() => null)
        : Promise.resolve(null), // Don't fetch if not needed
      getBrandGuidelines(context.shopDomain).catch(() => null),
    ]);
    
    logger.info('Using demo products for chatbot', {
      productCount: allProducts.length,
      products: allProducts.map(p => ({ id: p.id, title: p.title, price: p.price })),
    });

    // Get relevant products based on intent
    let recommendedProducts: any[] = [];
    let scenarioContext: any = null;
    let isOutfitQuery = false;
    
    const shouldFetchProducts = 
      intent.type === 'search' || 
      intent.type === 'recommendation' || 
      intent.wantsRecommendations;

    if (shouldFetchProducts && allProducts.length > 0) {
      try {
        // Check if user is asking for a complete outfit
        isOutfitQuery = isCompleteOutfitQuery(message);
        
        if (isOutfitQuery) {
          // Extract scenario context (interview, wedding, casual, etc.)
          scenarioContext = extractScenarioContext(message);
          
          logger.info('Scenario-based outfit query detected', {
            scenario: scenarioContext.scenario,
            budget: scenarioContext.budget,
            requiredItems: scenarioContext.requiredItems,
          });
          
          // Recommend complete outfit based on scenario
          const outfitRecommendation = recommendCompleteOutfit(allProducts, scenarioContext);
          recommendedProducts = outfitRecommendation.items;
          
          logger.info('Complete outfit recommended', {
            itemCount: recommendedProducts.length,
            totalPrice: outfitRecommendation.totalPrice,
            missingCategories: outfitRecommendation.missingCategories,
          });
        } else {
          // Regular product search
          const productLimit = getProductLimitForQuery(intent, allProducts.length);
          
          // Use semantic search for better product matching
          const scoredProducts = await semanticProductSearch(
            allProducts,
            message,
            intent,
            productLimit
          );
          
          recommendedProducts = scoredProducts.map(sp => sp.product);

          // If viewing a product and asking for recommendations, use complementary ranking
          if (context.currentProduct && intent.type === 'recommendation') {
            recommendedProducts = rankProductsByRelevance(
              allProducts,
              context.currentProduct,
              productLimit
            );
          }

          logger.info('Product search results', {
            query: message,
            intentType: intent.type,
            foundProducts: recommendedProducts.length,
            limit: productLimit,
          });
        }
      } catch (searchError) {
        logger.error('Product search failed, using fallback', searchError, {
          query: message,
        });
        // Fallback: just return first N products
        recommendedProducts = allProducts.slice(0, 10);
      }
    }

    // Build comprehensive prompt with context
    // Include full product catalog for smart recommendations
    const prompt = buildChatPrompt(
      message,
      {
        currentProduct: context.currentProduct || null,
        recommendedProducts,
        allProducts: allProducts, // Give LLM full catalog access for smart recommendations
        policies: policies || {},
        brandGuidelines: brandGuidelines || {},
        customer: session.customerId ? { logged_in: true, id: session.customerId } : null,
        cart: session.cart || null,
        scenarioContext: scenarioContext, // Pass scenario context to Gemini
        isOutfitQuery: isOutfitQuery,
      },
      intent
    );

    // Generate response using Gemini (THIS is where we use AI - NOT for intent detection)
    if (!process.env.REPLICATE_API_TOKEN) {
      logger.error('REPLICATE_API_TOKEN not set', {
        sessionId,
        message: message.substring(0, 100),
      });
      throw new Error('REPLICATE_API_TOKEN is not set');
    }

    logger.info('Generating chat response with Gemini', {
      intentType: intent.type,
      promptLength: prompt.length,
      hasProducts: recommendedProducts.length > 0,
      productCount: recommendedProducts.length,
    });

    const gemini = new GeminiClient(process.env.REPLICATE_API_TOKEN);
    let response: string;
    try {
      response = await gemini.chat([], prompt);
      
      logger.info('Gemini response generated successfully', {
        responseLength: response.length,
        intentType: intent.type,
      });
    } catch (error: any) {
      const errorMessage = error.message || error.toString() || 'Unknown error';
      logger.error('Gemini chat error', {
        error: errorMessage,
        stack: error.stack,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode,
        name: error.name,
        promptLength: prompt.length,
        hasToken: !!process.env.REPLICATE_API_TOKEN,
        intentType: intent.type,
        details: JSON.stringify(error).substring(0, 500),
      });
      throw createServerError(`Failed to generate response: ${errorMessage}`, 'AI_ERROR');
    }

    // Extract products from response (if any)
    let cleanedResponse: string = response;
    let llmExtractedProducts: any[] = [];
    try {
      const extracted = extractProductsFromResponse(response, recommendedProducts);
      cleanedResponse = extracted.cleanedText || response;
      llmExtractedProducts = extracted.extractedProducts || [];
    } catch (error: any) {
      logger.warn('Product extraction failed, using raw response', { error });
      cleanedResponse = response;
    }

    let ticketId: string | undefined;
    if (intent.wantsTicket && intent.ticketStage === 'create') {
      try {
        const ticketInfo = extractTicketInfo(response);
        if (ticketInfo.hasTicket && ticketInfo.issue) {
          ticketId = await createTicket({
            sessionId,
            shopDomain: context.shopDomain,
            customerId: context.customerId,
            issueCategory: 'General',
            issueDescription: ticketInfo.issue,
            metadata: {
              currentProduct: context.currentProduct,
              conversationContext: message,
            },
          });
        }
      } catch (error) {
        logger.error('Failed to create ticket', error);
      }
    }

    // Determine final products to return
    const shouldIncludeProducts =
      !intent.wantsTicket &&
      intent.type !== 'ticket_creation' &&
      intent.type !== 'policy_query' &&
      (intent.type === 'recommendation' || intent.type === 'search' || intent.wantsRecommendations);

    const finalProducts: any[] = [];
    if (shouldIncludeProducts) {
      // Use LLM extracted products if available, otherwise use recommended products
      const productsToUse = llmExtractedProducts.length > 0 ? llmExtractedProducts : recommendedProducts;
      
      if (llmExtractedProducts.length > 0) {
        // LLM extracted specific products from full catalog - match them with full product data
        for (const llmRec of llmExtractedProducts.slice(0, 5)) {
          const existingProduct = allProducts.find(p => p.id === llmRec.id);
          if (existingProduct) {
            finalProducts.push({
              id: existingProduct.id,
              title: existingProduct.title || existingProduct.name,
              price: existingProduct.price,
              image: existingProduct.image || existingProduct.imageUrl || existingProduct.thumbnail || existingProduct.images?.[0],
              imageUrl: existingProduct.image || existingProduct.imageUrl || existingProduct.thumbnail || existingProduct.images?.[0],
              thumbnail: existingProduct.image || existingProduct.imageUrl || existingProduct.thumbnail || existingProduct.images?.[0],
              category: existingProduct.category,
              type: existingProduct.type,
              description: existingProduct.description,
              inStock: existingProduct.inStock !== false,
            });
          }
        }
      }
      
      // If LLM didn't extract products or we need more, use recommended products (but filter out same category)
      if (finalProducts.length < 5 && recommendedProducts.length > 0) {
        const existingIds = new Set(finalProducts.map(p => p.id));
        const currentProductCategory = context.currentProduct?.category?.toLowerCase() || '';
        
        for (const product of recommendedProducts) {
          if (finalProducts.length >= 5) break;
          if (!existingIds.has(product.id)) {
            // Skip products from same category as current product
            const productCategory = (product.category || '').toLowerCase();
            if (currentProductCategory && productCategory === currentProductCategory) {
              continue; // Skip same category products
            }
            
            finalProducts.push({
              id: product.id,
              title: product.title || product.name,
              price: product.price,
              image: product.image || product.imageUrl || product.thumbnail || product.images?.[0],
              imageUrl: product.image || product.imageUrl || product.thumbnail || product.images?.[0],
              thumbnail: product.image || product.imageUrl || product.thumbnail || product.images?.[0],
              category: product.category,
              type: product.type,
              description: product.description,
              inStock: product.inStock !== false,
            });
          }
        }
      }
    }

    Promise.all([
      incrementChatOutputUsage(context.shopDomain).catch(() => {}),
      addMessage(sessionId, {
        role: 'user',
        content: message,
        timestamp: Date.now(),
        metadata: { intent },
      }).catch(() => {}),
      addMessage(sessionId, {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        metadata: { products: finalProducts.slice(0, 5), ticketId },
      }).catch(() => {}),
      saveConversation(sessionId, 'user', message, { intent }).catch(() => {}),
      saveConversation(sessionId, 'assistant', response, {
        products: finalProducts.slice(0, 5),
        ticketId,
      }).catch(() => {}),
      sessionUpdatePromise,
    ]).catch(() => {});

    return NextResponse.json({
      message: cleanedResponse,
      products: finalProducts,
      intent: intent.type,
      ticketId,
      ticketStage: intent.ticketStage,
      wantsTicket: intent.wantsTicket,
    });
  } catch (error: any) {
    logger.error('Chat API error', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error,
    });
    
    // Provide more detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    const { status, body } = handleApiError(error);
    
    return NextResponse.json(
      {
        ...body,
        ...(isDevelopment && {
          details: error.message,
          stack: error.stack,
        }),
      },
      { status }
    );
  }
}

