/**
 * Production Validators
 * Validates inputs, outputs, and intermediate data for virtual try-on
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const MAX_USER_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_USER_PHOTO_SIZE = 10 * 1024; // 10KB
const MAX_PRODUCT_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MIN_PRODUCT_IMAGE_SIZE = 10 * 1024; // 10KB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];

/**
 * Validates user photo
 */
export function validateUserPhoto(userPhoto: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file exists
  if (!userPhoto) {
    errors.push("User photo is required");
    return { isValid: false, errors, warnings };
  }

  // Check file size
  if (userPhoto.size > MAX_USER_PHOTO_SIZE) {
    errors.push(`User photo size exceeds ${MAX_USER_PHOTO_SIZE / 1024 / 1024}MB limit`);
  } else if (userPhoto.size < MIN_USER_PHOTO_SIZE) {
    errors.push(`User photo size is too small (minimum ${MIN_USER_PHOTO_SIZE / 1024}KB)`);
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(userPhoto.type)) {
    errors.push(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
  }

  // Check filename
  if (!userPhoto.name || userPhoto.name.trim().length === 0) {
    warnings.push("User photo filename is empty or invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates product images
 */
export function validateProductImages(productImages: File[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check at least one product image
  if (!productImages || productImages.length === 0) {
    errors.push("At least one product image is required");
    return { isValid: false, errors, warnings };
  }

  // Check maximum number of images
  if (productImages.length > 5) {
    errors.push("Maximum 5 product images allowed");
  }

  // Validate each image
  productImages.forEach((image, index) => {
    if (!image) {
      errors.push(`Product image ${index + 1} is missing`);
      return;
    }

    // Check file size
    if (image.size > MAX_PRODUCT_IMAGE_SIZE) {
      errors.push(`Product image ${index + 1} size exceeds ${MAX_PRODUCT_IMAGE_SIZE / 1024 / 1024}MB limit`);
    } else if (image.size < MIN_PRODUCT_IMAGE_SIZE) {
      errors.push(`Product image ${index + 1} size is too small (minimum ${MIN_PRODUCT_IMAGE_SIZE / 1024}KB)`);
    }

    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      errors.push(`Product image ${index + 1} has invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
    }

    // Check filename
    if (!image.name || image.name.trim().length === 0) {
      warnings.push(`Product image ${index + 1} filename is empty or invalid`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates product metadata from Gemini analysis
 */
export function validateProductMetadata(metadata: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!metadata || typeof metadata !== "object") {
    errors.push("Product metadata is invalid or missing");
    return { isValid: false, errors, warnings };
  }

  // Check required fields
  if (!metadata.productCategory || metadata.productCategory === "Unknown") {
    warnings.push("Product category is missing or unknown");
  }

  if (!metadata.detailedVisualDescription || metadata.detailedVisualDescription === "Unknown" || metadata.detailedVisualDescription.length < 20) {
    warnings.push("Product description is missing, unknown, or too short");
  }

  if (!metadata.imageGenerationPrompt || metadata.imageGenerationPrompt === "Unknown" || metadata.imageGenerationPrompt.length < 50) {
    warnings.push("Image generation prompt is missing, unknown, or too short");
  }

  // Check user characteristics
  if (!metadata.userCharacteristics || typeof metadata.userCharacteristics !== "object") {
    warnings.push("User characteristics are missing or invalid");
  } else {
    if (!metadata.userCharacteristics.genderHint || metadata.userCharacteristics.genderHint === "unknown") {
      warnings.push("User gender hint is missing or unknown - may affect anatomical correctness");
    }
    if (!metadata.userCharacteristics.visibility || metadata.userCharacteristics.visibility === "Unknown") {
      warnings.push("User body visibility is missing or unknown");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates prompt quality
 */
export function validatePromptQuality(prompt: string, categoryConfig: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!prompt || typeof prompt !== "string") {
    errors.push("Prompt is invalid or missing");
    return { isValid: false, errors, warnings };
  }

  // Check minimum length
  if (prompt.length < 200) {
    errors.push("Prompt is too short (minimum 200 characters)");
  }

  // Check for placeholders (should all be replaced)
  const placeholders = prompt.match(/\{\{[\w_]+\}\}/g);
  if (placeholders && placeholders.length > 0) {
    errors.push(`Prompt contains unreplaced placeholders: ${placeholders.join(", ")}`);
  }

  // Check for critical elements
  if (!prompt.includes("ONE person") && !prompt.includes("ONE person only")) {
    warnings.push("Prompt may not enforce single person constraint");
  }

  if (!prompt.includes(categoryConfig?.type || "product")) {
    warnings.push("Prompt may not include category-specific guidance");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates generated image URL
 */
export function validateGeneratedImageUrl(imageUrl: string | undefined): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!imageUrl || typeof imageUrl !== "string") {
    errors.push("Generated image URL is missing or invalid");
    return { isValid: false, errors, warnings };
  }

  // Check URL format
  try {
    const url = new URL(imageUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push("Generated image URL must use HTTP or HTTPS protocol");
    }
  } catch (e) {
    errors.push("Generated image URL is not a valid URL");
  }

  // Check URL is not empty
  if (imageUrl.trim().length === 0) {
    errors.push("Generated image URL is empty");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitizes category string
 */
export function sanitizeCategory(category: string): string {
  if (!category || typeof category !== "string") {
    return "Fashion Accessory";
  }

  // Remove special characters and trim
  return category.trim().replace(/[^\w\s-]/g, "").substring(0, 100);
}

/**
 * Sanitizes description string
 */
export function sanitizeDescription(description: string): string {
  if (!description || typeof description !== "string") {
    return "A stylish product with premium design and quality materials.";
  }

  // Remove excessive whitespace and trim
  return description.trim().replace(/\s+/g, " ").substring(0, 1000);
}

