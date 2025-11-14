/**
 * Category System for Virtual Try-On
 * Maps detected product categories to standardized category types
 * Provides category-specific configuration (framing, camera, scale, etc.)
 */

export type CategoryType =
  | "HEADWEAR"
  | "CLOTHING_UPPER"
  | "CLOTHING_LOWER"
  | "CLOTHING_FULL"
  | "FOOTWEAR"
  | "ACCESSORY_BODY"
  | "ACCESSORY_CARRY"
  | "ACCESSORY_OTHER"
  | "UNKNOWN";

export interface CategoryConfig {
  type: CategoryType;
  targetFraming: "full-body" | "three-quarter" | "upper-body" | "mid-shot" | "head-and-shoulders";
  cameraHint: string;
  productScaleCategory: "small" | "medium" | "large";
  productScaleRatioToHead: number;
  requiresFullBody: boolean;
  poseDescription: string;
  backgroundPriority: "product" | "person" | "balanced";
}

/**
 * Maps product category strings to standardized category types
 */
export function mapCategoryToType(category: string): CategoryType {
  if (!category || category === "Unknown") return "UNKNOWN";

  const lowerCategory = category.toLowerCase();

  // HEADWEAR
  if (
    lowerCategory.includes("sunglass") ||
    lowerCategory.includes("glasses") ||
    lowerCategory.includes("eyewear") ||
    lowerCategory.includes("cap") ||
    lowerCategory.includes("hat") ||
    lowerCategory.includes("beanie") ||
    lowerCategory.includes("headwear") ||
    lowerCategory.includes("headband") ||
    lowerCategory.includes("bandana")
  ) {
    return "HEADWEAR";
  }

  // FOOTWEAR
  if (
    lowerCategory.includes("shoe") ||
    lowerCategory.includes("sneaker") ||
    lowerCategory.includes("boot") ||
    lowerCategory.includes("sandal") ||
    lowerCategory.includes("slipper") ||
    lowerCategory.includes("heel") ||
    lowerCategory.includes("footwear")
  ) {
    return "FOOTWEAR";
  }

  // CLOTHING_LOWER
  if (
    lowerCategory.includes("pant") ||
    lowerCategory.includes("trouser") ||
    lowerCategory.includes("jean") ||
    lowerCategory.includes("short") ||
    lowerCategory.includes("skirt") ||
    lowerCategory.includes("bottom")
  ) {
    return "CLOTHING_LOWER";
  }

  // CLOTHING_FULL
  if (
    lowerCategory.includes("dress") ||
    lowerCategory.includes("jumpsuit") ||
    lowerCategory.includes("playsuit") ||
    lowerCategory.includes("romper")
  ) {
    return "CLOTHING_FULL";
  }

  // ACCESSORY_BODY (Jewelry, Watches)
  if (
    lowerCategory.includes("watch") ||
    lowerCategory.includes("necklace") ||
    lowerCategory.includes("earring") ||
    lowerCategory.includes("bracelet") ||
    lowerCategory.includes("ring") ||
    lowerCategory.includes("anklet") ||
    lowerCategory.includes("jewelry")
  ) {
    return "ACCESSORY_BODY";
  }

  // ACCESSORY_CARRY (Bags)
  if (
    lowerCategory.includes("bag") ||
    lowerCategory.includes("backpack") ||
    lowerCategory.includes("handbag") ||
    lowerCategory.includes("tote") ||
    lowerCategory.includes("clutch") ||
    lowerCategory.includes("wallet") ||
    lowerCategory.includes("purse")
  ) {
    return "ACCESSORY_CARRY";
  }

  // ACCESSORY_OTHER
  if (
    lowerCategory.includes("belt") ||
    lowerCategory.includes("scarf") ||
    lowerCategory.includes("wrap") ||
    lowerCategory.includes("glove") ||
    lowerCategory.includes("tie") ||
    lowerCategory.includes("sock") ||
    lowerCategory.includes("hosiery")
  ) {
    return "ACCESSORY_OTHER";
  }

  // CLOTHING_UPPER (default for clothing items)
  if (
    lowerCategory.includes("shirt") ||
    lowerCategory.includes("t-shirt") ||
    lowerCategory.includes("top") ||
    lowerCategory.includes("blouse") ||
    lowerCategory.includes("hoodie") ||
    lowerCategory.includes("sweater") ||
    lowerCategory.includes("cardigan") ||
    lowerCategory.includes("jacket") ||
    lowerCategory.includes("coat") ||
    lowerCategory.includes("blazer") ||
    lowerCategory.includes("suit") ||
    lowerCategory.includes("jersey") ||
    lowerCategory.includes("activewear") ||
    lowerCategory.includes("underwear") ||
    lowerCategory.includes("lingerie") ||
    lowerCategory.includes("sleepwear") ||
    lowerCategory.includes("swimwear") ||
    lowerCategory.includes("clothing")
  ) {
    return "CLOTHING_UPPER";
  }

  return "UNKNOWN";
}

/**
 * Gets category-specific configuration
 */
export function getCategoryConfig(categoryType: CategoryType, detectedCategory: string): CategoryConfig {
  switch (categoryType) {
    case "HEADWEAR":
      return {
        type: "HEADWEAR",
        targetFraming: "head-and-shoulders",
        cameraHint: "85mm portrait lens, tight head-and-shoulders framing, face centered, include ~12% padding around head",
        productScaleCategory: "medium",
        productScaleRatioToHead: 1.2,
        requiresFullBody: false,
        poseDescription: "Natural frontal or slight 3/4 turn, neutral expression, looking at camera",
        backgroundPriority: "person",
      };

    case "FOOTWEAR":
      return {
        type: "FOOTWEAR",
        targetFraming: "full-body",
        cameraHint: "50mm full-body shot, feet clearly visible in foreground, natural standing pose, include ~12% padding",
        productScaleCategory: "large",
        productScaleRatioToHead: 0.9,
        requiresFullBody: true,
        poseDescription: "Natural standing pose, feet shoulder-width apart, weight evenly distributed, facing camera or slight 3/4 turn",
        backgroundPriority: "product",
      };

    case "CLOTHING_UPPER":
      return {
        type: "CLOTHING_UPPER",
        targetFraming: "three-quarter",
        cameraHint: "50-85mm three-quarter body shot, upper body and waist visible, natural posture, include ~12% padding",
        productScaleCategory: "large",
        productScaleRatioToHead: 1.0,
        requiresFullBody: false,
        poseDescription: "Natural standing pose, shoulders relaxed, arms at sides or slightly bent, facing camera or slight 3/4 turn",
        backgroundPriority: "balanced",
      };

    case "CLOTHING_LOWER":
      return {
        type: "CLOTHING_LOWER",
        targetFraming: "full-body",
        cameraHint: "50mm full-body shot, legs and feet visible, natural standing pose, include ~12% padding",
        productScaleCategory: "large",
        productScaleRatioToHead: 1.0,
        requiresFullBody: true,
        poseDescription: "Natural standing pose, legs straight but not rigid, feet slightly apart, facing camera or slight 3/4 turn",
        backgroundPriority: "product",
      };

    case "CLOTHING_FULL":
      return {
        type: "CLOTHING_FULL",
        targetFraming: "full-body",
        cameraHint: "50mm full-body shot, entire garment visible from top to bottom, natural standing pose, include ~12% padding",
        productScaleCategory: "large",
        productScaleRatioToHead: 1.0,
        requiresFullBody: true,
        poseDescription: "Natural standing pose, arms at sides or slightly bent, facing camera or slight 3/4 turn",
        backgroundPriority: "balanced",
      };

    case "ACCESSORY_BODY":
      // Differentiate between watches (mid-shot) and jewelry (head-and-shoulders or mid-shot)
      const isWatch = detectedCategory.toLowerCase().includes("watch");
      return {
        type: "ACCESSORY_BODY",
        targetFraming: isWatch ? "mid-shot" : "head-and-shoulders",
        cameraHint: isWatch
          ? "85mm mid-shot, wrist and watch clearly visible, chest-up framing, include ~12% padding"
          : "85mm head-and-shoulders or mid-shot depending on jewelry type, ensure jewelry is prominent and visible, include ~12% padding",
        productScaleCategory: "small",
        productScaleRatioToHead: isWatch ? 0.25 : 0.6,
        requiresFullBody: false,
        poseDescription: isWatch
          ? "Natural pose, wrist visible, arms positioned to showcase watch, facing camera or slight 3/4 turn"
          : "Natural pose showcasing jewelry, facing camera or slight 3/4 turn",
        backgroundPriority: "product",
      };

    case "ACCESSORY_CARRY":
      return {
        type: "ACCESSORY_CARRY",
        targetFraming: "three-quarter",
        cameraHint: "50-85mm three-quarter body shot, bag positioned naturally on body (shoulder/hand/crossbody), full bag visible, include ~12% padding",
        productScaleCategory: "medium",
        productScaleRatioToHead: 0.8,
        requiresFullBody: false,
        poseDescription: "Natural standing pose, bag worn naturally, one arm may be slightly bent, facing camera or slight 3/4 turn",
        backgroundPriority: "product",
      };

    case "ACCESSORY_OTHER":
      return {
        type: "ACCESSORY_OTHER",
        targetFraming: "three-quarter",
        cameraHint: "50-85mm three-quarter body shot, accessory clearly visible and properly positioned, include ~12% padding",
        productScaleCategory: "medium",
        productScaleRatioToHead: 0.7,
        requiresFullBody: false,
        poseDescription: "Natural standing pose, accessory positioned correctly, facing camera or slight 3/4 turn",
        backgroundPriority: "product",
      };

    default:
      // UNKNOWN fallback - conservative defaults
      return {
        type: "UNKNOWN",
        targetFraming: "three-quarter",
        cameraHint: "50mm neutral framing, ensure full product visible, include ~12% padding",
        productScaleCategory: "medium",
        productScaleRatioToHead: 1.0,
        requiresFullBody: false,
        poseDescription: "Natural standing pose, facing camera or slight 3/4 turn",
        backgroundPriority: "balanced",
      };
  }
}

/**
 * Determines if body reconstruction is needed based on category and user photo analysis
 */
export function requiresBodyReconstruction(
  categoryType: CategoryType,
  userVisibility: "head-only" | "upper-body" | "full-body",
): boolean {
  const config = getCategoryConfig(categoryType, "");

  // If category requires full body but user photo doesn't have it, reconstruct
  if (config.requiresFullBody && userVisibility !== "full-body") {
    return true;
  }

  // For clothing lower body items, always need full body if not present
  if (categoryType === "CLOTHING_LOWER" && userVisibility !== "full-body") {
    return true;
  }

  // For footwear, always need full body
  if (categoryType === "FOOTWEAR" && userVisibility !== "full-body") {
    return true;
  }

  return false;
}

/**
 * Gets studio background instruction based on category priority
 */
export function getStudioBackground(categoryConfig: CategoryConfig): string {
  const baseBackground = "neutral light-gray gradient (#e6e6e6 center, transitioning to #d0d0d0 at edges)";

  switch (categoryConfig.backgroundPriority) {
    case "product":
      return `${baseBackground}, softbox key light from front-left, soft fill light from front-right, subtle rim light from behind to separate subject. Focus lighting on product visibility.`;

    case "person":
      return `${baseBackground}, softbox key light from front-left, soft fill light from front-right, gentle rim light. Even lighting across subject's face and upper body.`;

    case "balanced":
      return `${baseBackground}, softbox key light from front-left, soft fill light from front-right, subtle rim light to separate subject from background. Balanced lighting for both person and product.`;

    default:
      return `${baseBackground}, softbox key + soft fill + subtle rim light`;
  }
}

/**
 * Gets enhanced negative prompt based on category type
 */
export function getCategoryNegativePrompt(categoryType: CategoryType): string {
  const baseNegative = "no duplicate person, no multiple people, no multiple poses, no multiple figures, no clones, no overlapping figures, no composite images, no multiple views, no extra limbs, no multiple heads, no floating body parts, no giant foreground product overlay, no child-like proportions, no cartoon style, no text, no watermark, no home interiors, no outdoor backgrounds, no double exposure, no triptych, no side-by-side figures";

  switch (categoryType) {
    case "HEADWEAR":
      return `${baseNegative}, no logos on lenses unless shown exactly in product reference, no distorted face, no unnatural facial expressions, no missing facial features`;

    case "FOOTWEAR":
      return `${baseNegative}, no floating shoes, no deformed feet, no wrong foot positioning, ensure both feet are visible and properly aligned, only ONE person`;

    case "CLOTHING_UPPER":
    case "CLOTHING_LOWER":
    case "CLOTHING_FULL":
      return `${baseNegative}, no multiple garments, no duplicate clothing, ensure ONE person wearing ONE garment correctly`;

    case "ACCESSORY_BODY":
      return `${baseNegative}, no misaligned jewelry, no floating accessories, ensure accessories are properly worn and positioned, only ONE person`;

    case "ACCESSORY_CARRY":
      return `${baseNegative}, no multiple bags, no duplicate bags, ensure ONE person carrying ONE bag correctly, bag must be properly worn/held`;

    case "ACCESSORY_OTHER":
      return `${baseNegative}, no multiple accessories, ensure ONE person wearing ONE accessory correctly`;

    default:
      return baseNegative;
  }
}

