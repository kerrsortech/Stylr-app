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
  // This is the primary method - LLM mentions product names naturally in response
  // Match product names flexibly - check for exact and partial matches
  if (allProducts.length > 0) {
    const productNames = allProducts.map(p => ({
      name: p.title || p.name || '',
      id: p.id,
      price: p.price || 0,
      category: p.category || '',
      type: p.type || '',
    })).filter(p => p.name.length > 0);

    // Sort by name length (longer names first) to match more specific names first
    productNames.sort((a, b) => b.name.length - a.name.length);

    // Look for product names in the response
    for (const product of productNames) {
      // Check if product name appears in response (case-insensitive, flexible matching)
      // Try exact word boundary match first, then partial match
      const escapedName = product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactNameRegex = new RegExp(`\\b${escapedName}\\b`, 'i');
      const partialNameRegex = new RegExp(escapedName, 'i');
      
      // Also try matching key words from product name (e.g., "Sky Blue Cotton Shirt" -> match "Sky Blue Cotton Shirt" or "Sky Blue Shirt")
      const nameWords = product.name.split(/\s+/).filter(w => w.length > 2);
      const keyWordsRegex = nameWords.length >= 2 
        ? new RegExp(nameWords.slice(0, 3).join('.*'), 'i') // Match first 3 significant words
        : null;
      
      if (exactNameRegex.test(responseText) || 
          partialNameRegex.test(responseText) ||
          (keyWordsRegex && keyWordsRegex.test(responseText))) {
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

  // Clean up the text - remove markdown formatting, extra whitespace, and product lists
  cleanedText = cleanedText
    .replace(/\*\*/g, '') // Remove bold markdown
    .replace(/\*/g, '') // Remove italic markdown
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    // Remove "AVAILABLE PRODUCTS" section and numbered product lists
    .replace(/AVAILABLE PRODUCTS:?\s*\n?/gi, '')
    .replace(/Available Products:?\s*\n?/gi, '')
    .replace(/FULL PRODUCT CATALOG:?\s*\n?/gi, '')
    .replace(/Full Product Catalog:?\s*\n?/gi, '')
    // Remove numbered lists that look like product lists (e.g., "1. Product Name | Category | ...")
    .replace(/\n\d+\.\s+[^|]+\|[^|]+\|[^\n]+\n?/g, '')
    // Remove bullet point product lists
    .replace(/\n-\s+[A-Z][^\n]+\n?/g, '')
    .replace(/\n•\s+[A-Z][^\n]+\n?/g, '')
    // Remove lines that are just product names (standalone lines with product names)
    .split('\n')
    .filter(line => {
      // Keep lines that don't look like product list items
      const trimmed = line.trim();
      // Remove lines that are just product names (if they match a product name exactly)
      if (allProducts.some(p => {
        const productName = (p.title || p.name || '').trim();
        return trimmed === productName || trimmed === `- ${productName}` || trimmed === `• ${productName}`;
      })) {
        return false;
      }
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .trim();

  return {
    cleanedText,
    extractedProducts: extractedProducts.slice(0, 10), // Limit to 10 products
  };
}

