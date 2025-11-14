import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Proxy endpoint to fetch images from S3 or other external sources
 * This solves CORS issues by fetching on the server side
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL to prevent SSRF attacks
    try {
      const url = new URL(imageUrl);
      // Only allow HTTPS URLs
      if (url.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Only HTTPS URLs are allowed' },
          { status: 400 }
        );
      }
      
      // Optional: Whitelist specific domains
      const allowedDomains = [
        'vvapp.s3.ap-south-1.amazonaws.com',
        's3.amazonaws.com',
        's3.ap-south-1.amazonaws.com',
        // Add other allowed domains here
      ];
      
      const isAllowedDomain = allowedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      
      if (!isAllowedDomain) {
        logger.warn('Blocked image proxy request for unauthorized domain', { 
          hostname: url.hostname 
        });
        return NextResponse.json(
          { error: 'Domain not allowed' },
          { status: 403 }
        );
      }
    } catch (urlError) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the image from the external source
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Stylr-Image-Proxy/1.0',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!imageResponse.ok) {
      logger.error('Failed to fetch image from external source', {
        url: imageUrl,
        status: imageResponse.status,
        statusText: imageResponse.statusText,
      });
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: imageResponse.status }
      );
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': '*', // Allow all origins since this is a proxy
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    logger.error('Image proxy error', {
      error: error.message,
      stack: error.stack,
    });

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

