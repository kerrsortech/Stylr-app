/**
 * Prompt Helper Functions
 * Utilities for body detection and prompt generation helpers
 */

/**
 * Detects body availability in user photo
 * Currently uses filename-based detection - can be enhanced with image analysis
 * 
 * @param userPhoto - User photo file
 * @returns Body availability: "full-body" | "upper-body" | "head-only"
 */
export function detectBodyAvailabilitySync(userPhoto: File): "head-only" | "upper-body" | "full-body" {
  // Simple filename-based detection
  // TODO: Enhance with actual image analysis using Gemini or image processing
  const filename = userPhoto.name.toLowerCase();
  
  // Check filename for hints
  if (filename.includes("full") || filename.includes("fullbody") || filename.includes("full-body") || filename.includes("standing")) {
    return "full-body";
  }
  
  if (filename.includes("upper") || filename.includes("upperbody") || filename.includes("upper-body") || filename.includes("torso") || filename.includes("chest")) {
    return "upper-body";
  }
  
  if (filename.includes("head") || filename.includes("portrait") || filename.includes("face") || filename.includes("selfie")) {
    return "head-only";
  }
  
  // Default: assume upper-body (most common)
  // In production, this should use image analysis
  return "upper-body";
}

/**
 * Async version of body availability detection
 * Can be enhanced with actual image analysis
 */
export async function detectBodyAvailability(userPhoto: File): Promise<"head-only" | "upper-body" | "full-body"> {
  // For now, use sync version
  // TODO: Implement image analysis using Gemini or image processing libraries
  return detectBodyAvailabilitySync(userPhoto);
}

