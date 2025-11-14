/**
 * Category-Specific Prompt Templates
 * Provides enhanced prompts optimized for each category type
 */

import type { CategoryConfig } from "./category-system";

/**
 * Detects bag type from product category string
 */
function detectBagType(category: string): "handbag" | "shoulder" | "crossbody" | "backpack" | "tote" | "clutch" | "belt-bag" | "generic" {
  if (!category) return "generic";
  const lower = category.toLowerCase();

  if (lower.includes("handbag") || lower.includes("hand bag") || lower.includes("purse") || lower.includes("mini purse") || lower.includes("clutch")) {
    return lower.includes("clutch") ? "clutch" : "handbag";
  }
  if (lower.includes("shoulder bag") || lower.includes("shoulder")) {
    return "shoulder";
  }
  if (lower.includes("crossbody") || lower.includes("cross body")) {
    return "crossbody";
  }
  if (lower.includes("backpack") || lower.includes("back pack")) {
    return "backpack";
  }
  if (lower.includes("tote") || lower.includes("tote bag")) {
    return "tote";
  }
  if (lower.includes("belt bag") || lower.includes("beltbag") || lower.includes("fanny pack") || lower.includes("waist bag")) {
    return "belt-bag";
  }

  return "generic";
}

/**
 * Gets bag-specific instructions based on bag type
 */
function getBagSpecificInstructions(bagType: string): string {
  switch (bagType) {
    case "handbag":
      return `
SPECIAL INSTRUCTIONS FOR HANDBAG/MINI PURSE:
- Three-quarter body shot showing ONE person holding the handbag naturally.
- Handbag MUST be held in one hand (typically right hand) or resting on the forearm.
- Natural holding posture: arm slightly bent, handbag positioned naturally at waist/hip level, visible and prominent.
- The person's free hand can be at their side or slightly bent - natural standing pose.
- Ensure entire handbag is clearly visible, not partially obscured.
- Handbag handles/straps should appear natural, not stiff or awkward.
- Keep user's clothing as-is, only add the handbag.
- CRITICAL: Only ONE person in ONE pose with ONE handbag.
`;

    case "clutch":
      return `
SPECIAL INSTRUCTIONS FOR CLUTCH:
- Three-quarter body shot showing ONE person holding the clutch naturally.
- Clutch MUST be held in one hand (typically left or right hand) at waist/chest level, or tucked under arm.
- Natural holding posture: clutch positioned naturally, arm slightly bent or close to body.
- The person's other hand can be at their side - natural standing pose.
- Ensure entire clutch is clearly visible.
- Keep user's clothing as-is, only add the clutch.
- CRITICAL: Only ONE person in ONE pose with ONE clutch.
`;

    case "shoulder":
      return `
SPECIAL INSTRUCTIONS FOR SHOULDER BAG:
- Three-quarter body shot showing ONE person wearing the shoulder bag naturally.
- Shoulder bag MUST be positioned on one shoulder (typically left or right shoulder), strap resting naturally on shoulder.
- Natural wearing posture: bag hanging at side at waist/hip level, strap clearly visible over shoulder.
- The person's arms can be at sides or one arm slightly bent - natural standing pose.
- Ensure entire bag and strap are clearly visible.
- Bag should hang naturally, not stiff or awkward.
- Keep user's clothing as-is, only add the shoulder bag.
- CRITICAL: Only ONE person in ONE pose with ONE shoulder bag.
`;

    case "crossbody":
      return `
SPECIAL INSTRUCTIONS FOR CROSSBODY BAG:
- Three-quarter body shot showing ONE person wearing the crossbody bag naturally.
- Crossbody bag MUST be positioned diagonally across the body, strap going over one shoulder and across chest/back.
- Natural wearing posture: bag positioned at opposite hip/side from shoulder, strap visible across body.
- The person's arms can be at sides or one arm slightly bent - natural standing pose.
- Ensure entire bag and crossbody strap are clearly visible.
- Bag should hang naturally at hip/waist level on the opposite side.
- Keep user's clothing as-is, only add the crossbody bag.
- CRITICAL: Only ONE person in ONE pose with ONE crossbody bag.
`;

    case "backpack":
      return `
SPECIAL INSTRUCTIONS FOR BACKPACK:
- Three-quarter to full-body shot showing ONE person wearing the backpack naturally.
- Backpack MUST be positioned on the back, both straps over shoulders, straps visible.
- Natural wearing posture: backpack centered on back, straps properly fitted over shoulders, bag positioned naturally.
- The person can be facing camera or slight 3/4 turn - natural standing pose.
- Ensure backpack is clearly visible on the person's back.
- Straps should appear natural and properly fitted, not loose or awkward.
- Keep user's clothing as-is, only add the backpack.
- CRITICAL: Only ONE person in ONE pose with ONE backpack.
`;

    case "tote":
      return `
SPECIAL INSTRUCTIONS FOR TOTE BAG:
- Three-quarter body shot showing ONE person carrying the tote bag naturally.
- Tote bag can be held by handles in one hand OR on one shoulder, depending on bag style.
- Natural carrying posture: if held, arm slightly bent at waist/hip level; if on shoulder, strap over shoulder with bag at side.
- The person's other hand can be at their side - natural standing pose.
- Ensure entire tote bag is clearly visible.
- Handles or strap should appear natural.
- Keep user's clothing as-is, only add the tote bag.
- CRITICAL: Only ONE person in ONE pose with ONE tote bag.
`;

    case "belt-bag":
      return `
SPECIAL INSTRUCTIONS FOR BELT BAG/WAIST BAG:
- Three-quarter body shot showing ONE person wearing the belt bag naturally.
- Belt bag MUST be positioned around the waist/hips, strap visible around waist.
- Natural wearing posture: bag positioned at front, side, or back of waist/hips, strap fitting naturally around waist.
- The person's arms can be at sides - natural standing pose.
- Ensure entire belt bag and strap are clearly visible.
- Bag should sit naturally on waist/hips, not too high or too low.
- Keep user's clothing as-is, only add the belt bag.
- CRITICAL: Only ONE person in ONE pose with ONE belt bag.
`;

    default:
      return `
SPECIAL INSTRUCTIONS FOR BAGS (Generic):
- Three-quarter body shot showing ONE person wearing/carrying the bag naturally.
- Bag must be positioned correctly based on its design:
  * Handbags/mini purses: held in hand or on forearm
  * Shoulder bags: on one shoulder with strap visible
  * Crossbody bags: diagonally across body
  * Backpacks: on back with straps over shoulders
  * Tote bags: held by handles or on shoulder
- Ensure entire bag is visible, not partially cropped.
- Bag straps and handles should appear natural, not stiff or awkward.
- Keep user's clothing as-is, only add the bag.
- CRITICAL: Only ONE person in ONE pose with ONE bag.
`;
  }
}

/**
 * Base prompt template that all category templates extend
 */
const BASE_TEMPLATE = `REFERENCE IMAGES:
- User image: {{USER_IMAGE_URL}} — preserve identity, face, hair, and skin tone EXACTLY.
- Product images: {{PRODUCT_IMAGE_URLS}} — use to reproduce colors, textures, logos, hardware, and scale EXACTLY.

GOAL (CRITICAL):
Create EXACTLY ONE SINGLE photorealistic studio photograph of EXACTLY ONE person (the same person from the user image) wearing/using the product. 
- MUST be ONE person only, NO multiple people, NO multiple poses, NO duplicate subjects, NO clones
- MUST be a single, natural standing pose showcasing the product
- Preserve user identity, facial features, and skin tone exactly
- Output MUST be a single realistic image with one person in one pose only

MANDATORY FIDELITY RULES:
1) Face & identity preservation:
   - Preserve EXACT facial features, bone structure, hairline, facial hair, and skin tone from the user image.
   - DO NOT alter face shape, facial hair, or hairstyle.
   - Skin tone must match exactly across face, neck, hands, and all visible body parts.

2) Product fidelity:
   - Reproduce product color, texture, and hardware EXACTLY from product images.
   - Keep logos readable and at correct location/scale.
   - Match product dimensions and proportions to reference images.

3) SINGLE PERSON ENFORCEMENT (CRITICAL):
   - MUST generate EXACTLY ONE person in the image - NO exceptions
   - NO multiple people, NO multiple poses, NO duplicate subjects, NO clones, NO overlapping figures
   - NO composite images with multiple views/poses of the same person
   - NO overlapping big foreground crops, NO partial floating limbs
   - The output must be ONE person in ONE natural pose only

4) Scale & anatomical constraints:
   - Person must have realistic adult proportions (approx. 7–8 head heights).
   - If reconstructing body, use standard adult proportions based on face-to-body ratio.
   - All body parts must be anatomically correct and proportional.

IDENTITY & POSE:
Extracted user characteristics: {{USER_CHARACTERISTICS_JSON}}. Preserve these identity attributes EXACTLY: face shape, facial hair, hairline, eye shape, and skin tone.

CRITICAL GENDER SPECIFICATION:
The person in the generated image MUST be {{USER_GENDER}} (unless "unknown" is specified, then infer from user photo). When {{USER_GENDER}} is specified as "male" or "female", the physical features, body proportions, and overall appearance must accurately reflect {{USER_GENDER}} characteristics. Use realistic and natural {{USER_GENDER}} anatomical features, bone structure, and body proportions.

{{CATEGORY_SPECIFIC_INSTRUCTIONS}}

Pose & framing (MANDATORY):
- forcePoseChange is true. Ignore the user's original camera angle and pose.
- Target framing: {{TARGET_FRAMING}}
- Pose description: {{POSE_DESCRIPTION}}
- CRITICAL: Generate EXACTLY ONE person in ONE natural pose. NO multiple poses, NO multiple figures, NO composite views.
- The person must be shown in a single, simple standing pose that showcases the product naturally.
- When reconstructing full-body from head-only: build a realistic adult body using neutral fitted clothing (simple t-shirt + tapered pants) with ~7–8 head heights and natural proportions. Still only ONE person in ONE pose.
- ALWAYS replace background with studio: {{BACKGROUND_INSTRUCTION}}

SCALE CONSTRAINT (MANDATORY):
- Match product size to productScaleCategory ({{PRODUCT_SCALE_CATEGORY}}) and productScaleRatioToHead ({{PRODUCT_SCALE_RATIO}}).
- Target product width ≈ {{PRODUCT_SCALE_RATIO}} × user's head width (use face width from user image).
- Do not exceed +/- 20% of this target.
- If product would be larger than real-life proportions, reduce camera focal length or zoom out.

{{CLOTHING_SWAP_INSTRUCTIONS}}

PHOTOGRAPHY SPECIFICATIONS:
- Camera hint (apply exactly): {{CAMERA_HINT}}
- Studio background: {{BACKGROUND_INSTRUCTION}}
- Lighting: softbox key + soft fill, gentle rim light to separate subject from background.
- Lens: 50–85mm equivalent. Depth of field: slight background blur but both face and product in acceptable focus.
- Output look: Photorealistic, natural skin texture (no plastic smoothing), high-resolution (2K quality).
- Logo placement rule: NEVER add logos or text onto reflective surfaces (lenses, shiny metal) unless the product reference clearly shows the logo at that exact location.

NEGATIVE PROMPT (MANDATORY):
{{NEGATIVE_PROMPT}}

GENERATOR CONTROL & QUALITY:
- Use strong guidance scale / high fidelity (high guidance / low denoising).
- Generate 1–3 variations and select the most anatomically consistent.
- If face is modified or duplicates appear, automatically retry with higher guidance and different seed.

PRODUCT CATEGORY: {{PRODUCT_CATEGORY}}

PRODUCT SCALE CATEGORY: {{PRODUCT_SCALE_CATEGORY}}

PRODUCT DETAILS:
{{PRODUCT_DESCRIPTION}}

IMAGE GENERATION INSTRUCTIONS FROM ANALYSIS:
{{GEN_IMAGE_INSTRUCTIONS}}

POSITIVE PROMPT:
{{POSITIVE_PROMPT}}

CRITICAL OUTPUT REQUIREMENTS:
- Output MUST be EXACTLY ONE person in ONE pose only
- NO multiple people, NO multiple poses, NO composite views
- Single realistic studio photograph with one person wearing the product
- Natural standing pose showcasing the product clearly
- Clean studio background, professional product photography style`;

/**
 * Category-specific instructions to inject into base template
 */
export function getCategorySpecificInstructions(
  categoryConfig: CategoryConfig,
  detectedCategory?: string,
): string {
  switch (categoryConfig.type) {
    case "HEADWEAR":
      return `
SPECIAL INSTRUCTIONS FOR HEADWEAR:
- Focus on head-and-shoulders framing with product clearly visible.
- Preserve exact facial features and head shape.
- Product (sunglasses/glasses/hat) must fit naturally on head, not float or appear oversized.
- Ensure product sits correctly: glasses on bridge of nose, hat/cap level on head.
- Face should be the primary focus, product enhances rather than dominates.
`;

    case "FOOTWEAR":
      return `
SPECIAL INSTRUCTIONS FOR FOOTWEAR:
- MUST be full-body shot with feet clearly visible in foreground.
- Shoes must fit naturally on feet, not float or appear disconnected.
- Both feet must be visible and properly aligned (not overlapping unnaturally).
- Natural standing pose with weight evenly distributed.
- Ensure shoes are shown from the angle that best displays their design.
- Feet should be positioned naturally (shoulder-width apart, facing forward or slight turn).
`;

    case "CLOTHING_UPPER":
      return `
SPECIAL INSTRUCTIONS FOR UPPER BODY CLOTHING:
- Frame to show three-quarter body (chest to waist/hips).
- Garment must maintain exact fit characteristics from product reference (oversized stays oversized, fitted stays fitted).
- Replace user's upper garment with product, preserving body shape underneath.
- Clothing should drape naturally, following body contours.
- Ensure sleeves, collars, and all garment details are visible and correctly positioned.
`;

    case "CLOTHING_LOWER":
      return `
SPECIAL INSTRUCTIONS FOR LOWER BODY CLOTHING:
- MUST be full-body shot to showcase pants/shorts/skirt.
- Garment must maintain exact fit from product reference (baggy stays baggy, slim-fit stays slim-fit).
- Replace user's lower garment with product, preserving natural body proportions.
- Ensure waistband sits correctly, pants/shorts drape naturally down legs.
- Legs should be visible from hip to ankle (or to bottom of shorts).
`;

    case "CLOTHING_FULL":
      return `
SPECIAL INSTRUCTIONS FOR FULL BODY GARMENTS:
- MUST be full-body shot showing entire garment from top to bottom.
- Replace user's clothing with the dress/jumpsuit/playsuit.
- Garment must maintain exact silhouette and fit from product reference.
- Ensure all garment features are visible (neckline, sleeves if any, hemline).
- Natural standing pose that showcases the full garment.
`;

    case "ACCESSORY_BODY":
      return `
SPECIAL INSTRUCTIONS FOR BODY ACCESSORIES (Jewelry/Watches):
- For watches: mid-shot framing, wrist and watch clearly visible, positioned naturally.
- For jewelry: head-and-shoulders to mid-shot depending on type (neckline = mid-shot, earrings = head-and-shoulders).
- Accessories must be properly worn and positioned (not floating or misaligned).
- Keep user's clothing as-is, only add/replace the accessory.
- Ensure accessory is prominent but not overpowering.
- For watches: show watch face clearly visible, band properly fitted around wrist.
`;

    case "ACCESSORY_CARRY":
      // Determine bag type from product category for specific instructions
      const bagType = detectBagType(detectedCategory || "");
      return getBagSpecificInstructions(bagType);

    case "ACCESSORY_OTHER":
      return `
SPECIAL INSTRUCTIONS FOR OTHER ACCESSORIES (Belts/Scarves/Gloves/etc):
- Frame appropriately to show accessory clearly.
- Accessory must be properly worn/positioned (belt around waist, scarf around neck/shoulders, gloves on hands).
- Keep user's clothing as-is, only add the accessory.
- Ensure accessory is visible and properly fitted.
`;

    default:
      return `
SPECIAL INSTRUCTIONS:
- Apply general try-on principles: preserve identity, show product clearly, natural pose.
- Use three-quarter framing as default.
`;
  }
}

/**
 * Gets clothing swap instructions based on category
 */
export function getClothingSwapInstructions(categoryConfig: CategoryConfig): string {
  switch (categoryConfig.type) {
    case "HEADWEAR":
    case "FOOTWEAR":
    case "ACCESSORY_BODY":
    case "ACCESSORY_CARRY":
    case "ACCESSORY_OTHER":
      return `
CLOTHING-SWAP RULES:
- Keep user's clothing EXACTLY as shown in the user image.
- Only add the accessory/product to the user.
- Do NOT replace or modify existing clothing.
`;

    case "CLOTHING_UPPER":
      return `
CLOTHING-SWAP RULES:
- Replace ONLY the upper body garment (shirt/top/jacket/etc.) with the product.
- Preserve body shape and skin exposure exactly.
- Keep lower body clothing (pants/skirts) as shown in user image.
- If user image doesn't show lower body, use neutral fitted pants.
`;

    case "CLOTHING_LOWER":
      return `
CLOTHING-SWAP RULES:
- Replace ONLY the lower body garment (pants/shorts/skirt/etc.) with the product.
- Preserve body shape and natural proportions.
- Keep upper body clothing (shirt/top) as shown in user image.
- If user image doesn't show upper body, use neutral fitted t-shirt.
`;

    case "CLOTHING_FULL":
      return `
CLOTHING-SWAP RULES:
- Replace user's entire outfit with the dress/jumpsuit/playsuit product.
- Preserve body shape and natural proportions.
- Ensure the full garment covers appropriately based on its design.
`;

    default:
      return `
CLOTHING-SWAP RULES:
- If product is a garment, replace corresponding garment realistically.
- If product is an accessory, keep clothing as-is and only add accessory.
`;
  }
}

/**
 * Builds the complete category-specific prompt
 */
export function buildCategoryPrompt(
  categoryConfig: CategoryConfig,
  values: {
    userImageUrl: string;
    productImageUrls: string;
    productCategory: string;
    productDescription: string;
    genImageInstructions: string;
    userCharacteristicsJson: string;
    userGender: string;
    cameraHint: string;
    productScaleRatio: string;
    productScaleCategory: string;
    targetFraming: string;
    backgroundInstruction: string;
    positivePrompt: string;
    negativePrompt: string;
  },
): string {
  const categoryInstructions = getCategorySpecificInstructions(categoryConfig, values.productCategory);
  const clothingSwapInstructions = getClothingSwapInstructions(categoryConfig);

  let prompt = BASE_TEMPLATE
    .replace(/\{\{USER_IMAGE_URL\}\}/g, values.userImageUrl)
    .replace(/\{\{PRODUCT_IMAGE_URLS\}\}/g, values.productImageUrls)
    .replace(/\{\{PRODUCT_CATEGORY\}\}/g, values.productCategory)
    .replace(/\{\{PRODUCT_DESCRIPTION\}\}/g, values.productDescription)
    .replace(/\{\{GEN_IMAGE_INSTRUCTIONS\}\}/g, values.genImageInstructions)
    .replace(/\{\{USER_CHARACTERISTICS_JSON\}\}/g, values.userCharacteristicsJson)
    .replace(/\{\{USER_GENDER\}\}/g, values.userGender)
    .replace(/\{\{CAMERA_HINT\}\}/g, values.cameraHint)
    .replace(/\{\{PRODUCT_SCALE_RATIO\}\}/g, values.productScaleRatio)
    .replace(/\{\{PRODUCT_SCALE_CATEGORY\}\}/g, values.productScaleCategory)
    .replace(/\{\{TARGET_FRAMING\}\}/g, values.targetFraming)
    .replace(/\{\{BACKGROUND_INSTRUCTION\}\}/g, values.backgroundInstruction)
    .replace(/\{\{POSITIVE_PROMPT\}\}/g, values.positivePrompt)
    .replace(/\{\{NEGATIVE_PROMPT\}\}/g, values.negativePrompt)
    .replace(/\{\{POSE_DESCRIPTION\}\}/g, categoryConfig.poseDescription)
    .replace(/\{\{CATEGORY_SPECIFIC_INSTRUCTIONS\}\}/g, categoryInstructions)
    .replace(/\{\{CLOTHING_SWAP_INSTRUCTIONS\}\}/g, clothingSwapInstructions);

  return prompt;
}

