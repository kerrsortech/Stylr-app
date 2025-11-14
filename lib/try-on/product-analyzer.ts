import { GeminiClient } from '@/lib/ai/gemini-client';
import { logger } from '@/lib/utils/logger';
import { createServerError } from '@/lib/utils/error-handler';

export interface ProductMetadata {
  productCategory: string;
  detailedVisualDescription: string;
  imageGenerationPrompt: string;
  cameraHint: string;
  productScaleCategory: 'small' | 'medium' | 'large';
  productScaleRatioToHead: number;
  requiresFullBodyReconstruction: boolean;
  userCharacteristics: {
    visibility: 'head-only' | 'upper-body' | 'full-body';
    genderHint: 'male' | 'female' | 'unknown';
    ageRange: string;
    bodyBuild: string;
    skinTone: string;
    hairColor: string;
    facialHair: string;
    headOrientation: string;
    visibleClothing: string;
    faceWidthToHeightRatio: string | number;
  };
  forcePoseChange: boolean;
  targetFraming: string;
  backgroundInstruction: string;
  positivePrompt: string;
  negativePrompt: string;
}

let geminiClient: GeminiClient | null = null;

function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set');
    }
    geminiClient = new GeminiClient(process.env.REPLICATE_API_TOKEN);
  }
  return geminiClient;
}

/**
 * Analyze product page (optional enhancement)
 */
export async function analyzeProductPage(productUrl: string): Promise<{
  summary: string;
  enhancedDescription: string;
} | null> {
  try {
    // Fetch product page
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CloselookBot/1.0)',
      },
    });

    if (!response.ok) {
      logger.warn('Failed to fetch product page', { status: response.status });
      return null;
    }

    const html = await response.text();
    
    // Extract text content (simplified - can be enhanced with HTML parsing)
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Limit to 5000 characters

    const gemini = getGeminiClient();
    const prompt = `Analyze this product page HTML content and extract product details:

${textContent}

Return ONLY valid JSON:
{
  "summary": "Brief product summary (2-3 sentences)",
  "enhancedDescription": "Enhanced visual description with materials, design elements, and key features (3-4 sentences)"
}`;

    const result = await gemini.generateText(prompt, {
      temperature: 0.0,
      maxTokens: 500,
    });

    try {
      const cleaned = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (parseError) {
      logger.warn('Failed to parse product page analysis', { error: parseError });
      return null;
    }
  } catch (error: any) {
    logger.warn('Product page analysis error', { error });
    return null;
  }
}

/**
 * Analyze user photo and product image
 */
export async function analyzeProduct(
  userPhotoBase64: string,
  productImageBase64: string,
  productUrl?: string | null
): Promise<{
  metadata: ProductMetadata;
  pageAnalysis?: {
    summary: string;
    enhancedDescription: string;
  } | null;
}> {
  try {
    // Optional: Analyze product page if URL provided
    let pageAnalysis: { summary: string; enhancedDescription: string } | null = null;
    if (productUrl && productUrl.trim().length > 0 && productUrl.startsWith('http')) {
      try {
        pageAnalysis = await analyzeProductPage(productUrl);
      } catch (error) {
        logger.warn('Product page analysis failed', { error });
        // Continue without page analysis
      }
    }

    const prompt = `You will receive TWO images:

1. USER PHOTO (first image) - The person who will wear the product
2. PRODUCT IMAGE (second image) - The product to be worn

Analyze BOTH images and return ONLY valid JSON:

{
  "productCategory": "specific category (e.g., Running Shoes, Leather Jacket)",
  "detailedVisualDescription": "2-4 sentences describing product visually",
  "imageGenerationPrompt": "4-6 imperative sentences for image generation model",
  "cameraHint": "camera setup (e.g., 85mm portrait, 50mm full-body)",
  "productScaleCategory": "small" | "medium" | "large",
  "productScaleRatioToHead": 0.5-2.0,
  "requiresFullBodyReconstruction": true | false,
  "userCharacteristics": {
    "visibility": "head-only" | "upper-body" | "full-body",
    "genderHint": "male" | "female" | "unknown",
    "ageRange": "teen|20-29|30-39|40-49|50+|Unknown",
    "bodyBuild": "slim|average|athletic|stocky|Unknown",
    "skinTone": "light|medium|tan|dark|Unknown",
    "hairColor": "black|brown|blonde|grey|bald|Unknown",
    "facialHair": "none|stubble|beard|mustache|Unknown",
    "headOrientation": "frontal|slight-3-4|profile|tilted|Unknown",
    "visibleClothing": "description or Unknown",
    "faceWidthToHeightRatio": "numeric or Unknown"
  },
  "forcePoseChange": true,
  "targetFraming": "full-body|three-quarter|upper-body|head-and-shoulders|mid-shot",
  "backgroundInstruction": "studio background description",
  "positivePrompt": "additional positive keywords",
  "negativePrompt": "things to avoid"
}

CRITICAL ANALYSIS RULES:
- Analyze USER PHOTO for userCharacteristics (NOT product image)
- genderHint is ESSENTIAL for anatomical correctness
- Determine if full body reconstruction needed
- For bags: detect type (Handbag, Crossbody, Backpack, etc.)
- Target framing based on category:
  * Footwear/Full garments → "full-body"
  * Upper clothing → "three-quarter"
  * Headwear → "head-and-shoulders"
  * Accessories/Bags → "mid-shot"`;

    const gemini = getGeminiClient();
    const result = await gemini.analyzeImages(
      prompt,
      [
        { data: userPhotoBase64, mimeType: 'image/jpeg' },
        { data: productImageBase64, mimeType: 'image/jpeg' },
      ],
      { temperature: 0.0, maxTokens: 768 }
    );

    let metadata: ProductMetadata;
    try {
      const cleaned = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      metadata = JSON.parse(cleaned) as ProductMetadata;
    } catch (parseError) {
      logger.error('Failed to parse product metadata', parseError, {
        response: result.substring(0, 200),
      });
      throw createServerError('Failed to analyze product', 'PRODUCT_ANALYSIS_ERROR');
    }

    // Enhance metadata with page analysis if available
    if (pageAnalysis) {
      metadata.detailedVisualDescription = `${metadata.detailedVisualDescription} ${pageAnalysis.enhancedDescription}`;
      logger.info('Enhanced metadata with page analysis');
    }

    return {
      metadata,
      pageAnalysis: pageAnalysis || undefined,
    };
  } catch (error: any) {
    logger.error('Product analysis error', error);
    if (error.message?.includes('PRODUCT_ANALYSIS_ERROR')) {
      throw error;
    }
    throw createServerError('Failed to analyze product images', 'ANALYSIS_ERROR');
  }
}

