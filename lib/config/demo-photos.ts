/**
 * Demo photo configuration
 * For demo purposes, we use hardcoded photo URLs that are always available
 * regardless of user authentication status
 */

// Hardcoded demo photo URL - always available for demo
export const DEMO_PORTRAIT_PHOTO_URL = 'https://vvapp.s3.ap-south-1.amazonaws.com/user-photos/session_1762605636674_6a5405b7-/portrait-1762983515435.png';

// Demo session ID for storing demo photos
export const DEMO_SESSION_ID = 'demo_session_default';

// Demo customer ID (for demo purposes only)
export const DEMO_CUSTOMER_ID = 'demo_customer';

// Demo shop domain
export const DEMO_SHOP_DOMAIN = 'test-store.myshopify.com';

/**
 * Get demo photo URL - returns the hardcoded demo photo
 * This ensures the photo is always available for demo purposes
 */
export function getDemoPhotoUrl(photoType: 'portrait' | 'standing' = 'portrait'): string {
  if (photoType === 'portrait') {
    return DEMO_PORTRAIT_PHOTO_URL;
  }
  // For standing photo, use portrait as fallback for now
  return DEMO_PORTRAIT_PHOTO_URL;
}

