/**
 * Production Enhancements
 * Enhances prompts and metadata for production-quality image generation
 */

import type { CategoryConfig } from "./category-system";
import type { ProductMetadata } from "./product-analyzer";

/**
 * Enhances prompt for production quality
 */
export function enhancePromptForProduction(
  prompt: string,
  categoryConfig: CategoryConfig,
  detectedCategory: string,
): { enhancedPrompt: string; warnings: string[] } {
  const warnings: string[] = [];
  let enhancedPrompt = prompt;

  // Ensure single-person enforcement
  if (!enhancedPrompt.includes("ONE person") && !enhancedPrompt.includes("EXACTLY ONE")) {
    enhancedPrompt = "CRITICAL: Generate EXACTLY ONE person only. " + enhancedPrompt;
    warnings.push("Added single-person enforcement to prompt");
  }

  // Ensure facial fidelity
  if (!enhancedPrompt.includes("preserve") && !enhancedPrompt.includes("exact facial")) {
    enhancedPrompt = enhancedPrompt + " CRITICAL: Preserve exact facial features from user image.";
    warnings.push("Added facial fidelity enforcement to prompt");
  }

  // Ensure product fidelity
  if (!enhancedPrompt.includes("product") && !enhancedPrompt.includes("exact")) {
    enhancedPrompt = enhancedPrompt + " CRITICAL: Reproduce product exactly from reference images.";
    warnings.push("Added product fidelity enforcement to prompt");
  }

  // Add category-specific quality hints if missing
  if (categoryConfig.type !== "UNKNOWN" && !enhancedPrompt.includes(categoryConfig.type)) {
    warnings.push("Prompt may benefit from more category-specific guidance");
  }

  return {
    enhancedPrompt,
    warnings,
  };
}

/**
 * Enhances body reconstruction instructions
 */
export function enhanceBodyReconstructionInstructions(
  categoryConfig: CategoryConfig,
  userBodyAvailability: "head-only" | "upper-body" | "full-body",
  needsBodyReconstruction: boolean,
): string | null {
  if (!needsBodyReconstruction) {
    return null;
  }

  let instructions = `BODY RECONSTRUCTION REQUIRED:

The user photo shows: ${userBodyAvailability}.
The category (${categoryConfig.type}) requires: ${categoryConfig.requiresFullBody ? "full-body" : "partial body"}.

CRITICAL RECONSTRUCTION RULES:
1) Preserve the user's head, face, and upper body EXACTLY from the user image.
2) Reconstruct missing body parts using realistic adult proportions (approximately 7-8 head heights for full body).
3) Use neutral fitted clothing for reconstructed parts:
   - Simple fitted t-shirt (neutral color: white, gray, or black)
   - Tapered pants or fitted jeans (neutral color: dark blue, black, or gray)
4) Maintain natural body proportions:
   - Shoulder width: approximately 2-2.5 head widths
   - Torso length: approximately 2.5-3 head heights
   - Leg length: approximately 3.5-4 head heights
5) Ensure smooth transition between preserved and reconstructed parts.
6) Body should appear natural and anatomically correct.
7) Still generate ONLY ONE person in ONE pose.

`;

  if (categoryConfig.type === "FOOTWEAR") {
    instructions += `FOOTWEAR-SPECIFIC RECONSTRUCTION:
- Feet must be clearly visible and properly positioned.
- Both feet should be visible, shoulder-width apart.
- Natural standing pose with weight evenly distributed.
- Ensure shoes fit naturally on reconstructed feet.
`;
  }

  if (categoryConfig.type === "CLOTHING_LOWER") {
    instructions += `LOWER BODY CLOTHING-SPECIFIC RECONSTRUCTION:
- Legs must be fully visible from hip to ankle.
- Natural standing pose with legs straight but not rigid.
- Ensure pants/shorts/skirt fit naturally on reconstructed lower body.
`;
  }

  return instructions;
}

/**
 * Enhances product metadata with category config and fallbacks
 */
export function enhanceProductMetadata(
  metadata: ProductMetadata,
  productName: string,
  productCategory: string,
  categoryConfig: CategoryConfig,
): ProductMetadata {
  const enhanced: ProductMetadata = { ...metadata };

  // Enhance category if missing
  if (!enhanced.productCategory || enhanced.productCategory === "Unknown") {
    enhanced.productCategory = productCategory || "Fashion Accessory";
  }

  // Enhance description if missing
  if (!enhanced.detailedVisualDescription || enhanced.detailedVisualDescription === "Unknown" || enhanced.detailedVisualDescription.length < 20) {
    enhanced.detailedVisualDescription = `${productName} - A stylish ${enhanced.productCategory} with premium design and quality materials.`;
  }

  // Enhance image generation prompt if missing
  if (!enhanced.imageGenerationPrompt || enhanced.imageGenerationPrompt === "Unknown" || enhanced.imageGenerationPrompt.length < 50) {
    enhanced.imageGenerationPrompt = `Show the person wearing the ${enhanced.productCategory} in a natural, confident pose. Position the product prominently so it's clearly visible. Use professional studio lighting and a clean background.`;
  }

  // Enhance camera hint if missing
  if (!enhanced.cameraHint || enhanced.cameraHint === "Unknown") {
    enhanced.cameraHint = categoryConfig.cameraHint;
  }

  // Enhance scale if missing
  if (!enhanced.productScaleCategory) {
    enhanced.productScaleCategory = categoryConfig.productScaleCategory;
  }

  if (!enhanced.productScaleRatioToHead || enhanced.productScaleRatioToHead === 0) {
    enhanced.productScaleRatioToHead = categoryConfig.productScaleRatioToHead;
  }

  // Enhance framing if missing
  if (!enhanced.targetFraming || enhanced.targetFraming === "Unknown") {
    enhanced.targetFraming = categoryConfig.targetFraming;
  }

  // Enhance background if missing
  if (!enhanced.backgroundInstruction || enhanced.backgroundInstruction === "Unknown") {
    enhanced.backgroundInstruction = "Clean, professional studio background with soft lighting. Neutral light-gray gradient.";
  }

  // Enhance positive prompt if missing
  if (!enhanced.positivePrompt || enhanced.positivePrompt === "Unknown") {
    enhanced.positivePrompt = "photorealistic, high-resolution, professional studio lighting, sharp focus, natural skin texture, commercial product photography";
  }

  // Enhance negative prompt if missing
  if (!enhanced.negativePrompt || enhanced.negativePrompt === "Unknown") {
    enhanced.negativePrompt = "Blurry, distorted, low quality, cartoon, illustration, painting, watermark, text, logo, multiple people, deformed, ugly, bad anatomy";
  }

  // Enhance user characteristics if missing
  if (!enhanced.userCharacteristics || typeof enhanced.userCharacteristics !== "object") {
    enhanced.userCharacteristics = {
      visibility: "full-body",
      genderHint: "unknown",
      ageRange: "Unknown",
      bodyBuild: "Unknown",
      skinTone: "Unknown",
      hairColor: "Unknown",
      facialHair: "Unknown",
      headOrientation: "Unknown",
      visibleClothing: "Unknown",
      faceWidthToHeightRatio: "Unknown",
    };
  }

  // Ensure forcePoseChange is set
  if (enhanced.forcePoseChange === undefined) {
    enhanced.forcePoseChange = true;
  }

  // Ensure requiresFullBodyReconstruction is set based on category
  if (enhanced.requiresFullBodyReconstruction === undefined) {
    enhanced.requiresFullBodyReconstruction = categoryConfig.requiresFullBody;
  }

  return enhanced;
}

