import type { ProductMetadata } from './product-analyzer';
import type { CategoryConfig } from './category-system';

/**
 * Build try-on prompt for image generation
 */
export function buildTryOnPrompt(
  metadata: ProductMetadata,
  categoryConfig: CategoryConfig
): string {
  const {
    userCharacteristics,
    productCategory,
    detailedVisualDescription,
    targetFraming,
    backgroundInstruction,
    positivePrompt,
    negativePrompt,
  } = metadata;

  // Build base prompt
  let prompt = `Generate a photorealistic ${targetFraming} image of a person wearing ${productCategory}. `;

  // Add user characteristics
  if (userCharacteristics.genderHint !== 'unknown') {
    prompt += `The person is ${userCharacteristics.genderHint}. `;
  }

  if (userCharacteristics.ageRange !== 'Unknown') {
    prompt += `Age: ${userCharacteristics.ageRange}. `;
  }

  if (userCharacteristics.bodyBuild !== 'Unknown') {
    prompt += `Body build: ${userCharacteristics.bodyBuild}. `;
  }

  if (userCharacteristics.skinTone !== 'Unknown') {
    prompt += `Skin tone: ${userCharacteristics.skinTone}. `;
  }

  if (userCharacteristics.hairColor !== 'Unknown' && userCharacteristics.hairColor !== 'bald') {
    prompt += `Hair color: ${userCharacteristics.hairColor}. `;
  }

  // Add product details
  prompt += `${detailedVisualDescription} `;

  // Add framing and camera
  prompt += `Camera: ${categoryConfig.cameraHint}. `;
  prompt += `Framing: ${targetFraming}. `;

  // Add pose
  prompt += `Pose: ${categoryConfig.poseDescription}. `;

  // Add background
  if (backgroundInstruction) {
    prompt += `Background: ${backgroundInstruction}. `;
  } else {
    prompt += `Background: Clean, professional studio background with soft lighting. `;
  }

  // Add positive keywords
  if (positivePrompt) {
    prompt += `${positivePrompt} `;
  }

  // Add quality keywords
  prompt += `High quality, photorealistic, professional photography, natural lighting, sharp focus, detailed, 2K resolution.`;

  // Build negative prompt
  let negPrompt = negativePrompt || '';
  negPrompt += ' Blurry, distorted, low quality, cartoon, illustration, painting, watermark, text, logo, multiple people, deformed, ugly, bad anatomy.';

  return prompt.trim();
}

