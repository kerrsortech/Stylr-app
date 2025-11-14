/**
 * Product Page Analyzer
 * Analyzes product pages to extract additional product information
 */

import { GeminiClient } from "@/lib/ai/gemini-client";
import { logger } from "@/lib/utils/logger";

let geminiClient: GeminiClient | null = null;

function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is not set");
    }
    geminiClient = new GeminiClient(process.env.REPLICATE_API_TOKEN);
  }
  return geminiClient;
}

export interface PageAnalysis {
  summary: string;
  enhancedDescription: string;
  designElements?: string[];
  materials?: string[];
  keyFeatures?: string[];
}

/**
 * Analyzes a product page URL to extract product information
 */
export async function analyzeProductPage(
  productUrl: string
): Promise<PageAnalysis | null> {
  try {
    logger.info("Fetching product page", { productUrl });

    // Fetch product page
    const response = await fetch(productUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CloselookBot/1.0)",
      },
    });

    if (!response.ok) {
      logger.warn("Failed to fetch product page", { status: response.status, productUrl });
      return null;
    }

    const html = await response.text();

    // Extract text content (simplified - can be enhanced with HTML parsing)
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 5000); // Limit to 5000 characters

    const gemini = getGeminiClient();
    const prompt = `Analyze this product page HTML content and extract product details:

${textContent}

Return ONLY valid JSON:
{
  "summary": "Brief product summary (2-3 sentences)",
  "enhancedDescription": "Enhanced visual description with materials, design elements, and key features (3-4 sentences)",
  "designElements": ["design element 1", "design element 2"],
  "materials": ["material 1", "material 2"],
  "keyFeatures": ["feature 1", "feature 2"]
}`;

    const result = await gemini.generateText(prompt, {
      temperature: 0.0,
      maxTokens: 500,
    });

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn("Failed to extract JSON from product page analysis");
        return null;
      }

      const cleaned = jsonMatch[0]
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      return JSON.parse(cleaned) as PageAnalysis;
    } catch (parseError) {
      logger.warn("Failed to parse product page analysis", { parseError });
      return null;
    }
  } catch (error: any) {
    logger.warn("Product page analysis error", { error: error.message, productUrl });
    return null;
  }
}

/**
 * Builds enhanced product description by combining original description with page analysis
 */
export function buildEnhancedProductDescription(
  originalDescription: string,
  pageAnalysis: PageAnalysis
): string {
  if (!pageAnalysis.enhancedDescription) {
    return originalDescription;
  }

  // Combine original description with enhanced description from page analysis
  const enhanced = `${originalDescription} ${pageAnalysis.enhancedDescription}`.trim();

  // Add materials if available
  if (pageAnalysis.materials && pageAnalysis.materials.length > 0) {
    const materialsText = `Materials: ${pageAnalysis.materials.join(", ")}.`;
    return `${enhanced} ${materialsText}`;
  }

  return enhanced;
}

/**
 * Enhances image generation prompt with page analysis insights
 */
export function enhancePromptWithPageAnalysis(
  originalPrompt: string,
  pageAnalysis: PageAnalysis
): string {
  if (!pageAnalysis) {
    return originalPrompt;
  }

  let enhanced = originalPrompt;

  // Add design elements if available
  if (pageAnalysis.designElements && pageAnalysis.designElements.length > 0) {
    enhanced += ` Pay attention to design elements: ${pageAnalysis.designElements.join(", ")}.`;
  }

  // Add key features if available
  if (pageAnalysis.keyFeatures && pageAnalysis.keyFeatures.length > 0) {
    enhanced += ` Highlight key features: ${pageAnalysis.keyFeatures.join(", ")}.`;
  }

  return enhanced.trim();
}

