/**
 * Extract product recommendations from AI response text
 * Handles both structured JSON format and plain text mentions
 */

export interface ExtractedProduct {
  id: string;
  name: string;
  price: number;
  reason?: string;
}

/**
 * Extract products from AI response
 * Looks for PRODUCT_RECOMMENDATION format and also plain text mentions
 */
export function extractProductsFromResponse(
  responseText: string,
  allProducts: any[]
): {
  cleanedText: string;
  extractedProducts: ExtractedProduct[];
} {
  const extractedProducts: ExtractedProduct[] = [];
  let cleanedText = responseText;

  // Extract PRODUCT_RECOMMENDATION format: PRODUCT_RECOMMENDATION: {"id": "...", "name": "...", "price": 99, "reason": "..."}
  const productRecommendationRegex = /PRODUCT_RECOMMENDATION:\s*(\{[^}]+\})/gi;
  const matches = responseText.matchAll(productRecommendationRegex);

  for (const match of matches) {
    try {
      const productJson = JSON.parse(match[1]);
      if (productJson.id && productJson.name) {
        extractedProducts.push({
          id: productJson.id,
          name: productJson.name,
          price: productJson.price || 0,
          reason: productJson.reason,
        });
        // Remove the PRODUCT_RECOMMENDATION line from cleaned text
        cleanedText = cleanedText.replace(match[0], '').trim();
      }
    } catch (error) {
      // Invalid JSON, skip
      continue;
    }
  }

  // Also try to extract products mentioned in plain text by matching product names
  // This is a fallback if PRODUCT_RECOMMENDATION format wasn't used
  if (extractedProducts.length === 0 && allProducts.length > 0) {
    const productNames = allProducts.map(p => ({
      name: p.title || p.name || '',
      id: p.id,
      price: p.price || 0,
    })).filter(p => p.name.length > 0);

    // Look for product names in the response
    for (const product of productNames) {
      // Check if product name appears in response (case-insensitive, whole word)
      const nameRegex = new RegExp(`\\b${product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (nameRegex.test(responseText)) {
        // Check if not already extracted
        if (!extractedProducts.some(ep => ep.id === product.id)) {
          extractedProducts.push({
            id: product.id,
            name: product.name,
            price: product.price,
          });
        }
      }
    }
  }

  // Clean up the text - remove markdown formatting, extra whitespace
  cleanedText = cleanedText
    .replace(/\*\*/g, '') // Remove bold markdown
    .replace(/\*/g, '') // Remove italic markdown
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .trim();

  return {
    cleanedText,
    extractedProducts: extractedProducts.slice(0, 10), // Limit to 10 products
  };
}

