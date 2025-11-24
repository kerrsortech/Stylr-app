/**
 * URL Helper Utilities
 * Handles URL construction for both development and production environments
 * Ensures images and API endpoints work correctly after deployment
 */

/**
 * Get the base URL for the application
 * Works in both client and server contexts
 * Handles Vercel deployment automatically
 */
export function getBaseUrl(): string {
  // Server-side: use environment variable or construct from request
  if (typeof window === 'undefined') {
    // Server-side rendering
    const vercelUrl = process.env.VERCEL_URL;
    const nextPublicUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (nextPublicUrl) {
      return nextPublicUrl;
    }
    
    if (vercelUrl) {
      // Vercel provides VERCEL_URL automatically
      return `https://${vercelUrl}`;
    }
    
    // Fallback for local development server
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  
  // Client-side: use window.location
  return window.location.origin;
}

/**
 * Get absolute URL for a public folder asset
 * Works in both development and production
 */
export function getPublicAssetUrl(path: string): string {
  // Remove leading slash if present (we'll add it)
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // In Next.js, public folder assets are served from root
  // This works in both dev and production
  return cleanPath;
}

/**
 * Get absolute URL for fetching an image
 * Handles both relative and absolute URLs
 */
export function getAbsoluteImageUrl(url: string): string {
  // If already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // For relative URLs, prepend base URL
  const baseUrl = getBaseUrl();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  
  return `${baseUrl}${cleanPath}`;
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production';
  }
  return window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
}

/**
 * Check if we're running on Vercel
 */
export function isVercel(): boolean {
  return !!process.env.VERCEL || !!process.env.VERCEL_URL;
}

