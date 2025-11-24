/**
 * Demo photo configuration
 * For demo purposes, we use hardcoded photo URLs that are always available
 * regardless of user authentication status
 */

// Hardcoded demo photo URLs - using local images from public folder
// These images are served from the public directory in Next.js
export const DEMO_PORTRAIT_PHOTO_URL = '/Portrait Photo.jpg';
export const DEMO_STANDING_PHOTO_URL = '/Standing Photo.jpg';

// Demo session ID for storing demo photos
export const DEMO_SESSION_ID = 'demo_session_default';

// Demo customer ID (for demo purposes only)
export const DEMO_CUSTOMER_ID = 'demo_customer';

// Demo shop domain
export const DEMO_SHOP_DOMAIN = 'test-store.myshopify.com';

/**
 * Get demo photo URL - returns the appropriate hardcoded demo photo
 * This ensures the photo is always available for demo purposes
 */
export function getDemoPhotoUrl(photoType: 'portrait' | 'standing' = 'portrait'): string {
  if (photoType === 'portrait') {
    return DEMO_PORTRAIT_PHOTO_URL;
  }
  // Return standing photo for standing type
  return DEMO_STANDING_PHOTO_URL;
}

