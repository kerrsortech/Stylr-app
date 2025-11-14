import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/lib/storage/s3-storage';
import { logger } from '@/lib/utils/logger';
import { sanitizeErrorForClient } from '@/lib/utils/error-handler';
import { db } from '@/lib/database/db';
import { sessions } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { getOrganizationByShopDomain } from '@/lib/database/organization-queries';
import { DEMO_PORTRAIT_PHOTO_URL } from '@/lib/config/demo-photos';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const photoType = formData.get('photoType') as string; // 'standing' or 'portrait'
    const sessionId = formData.get('sessionId') as string;
    const customerId = formData.get('customerId') as string | null;
    const setAsActive = formData.get('setAsActive') === 'true'; // If true, set as userPhotoUrl
    const shopDomain = formData.get('shopDomain') as string | null; // Get shopDomain from form data

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Generate S3 key: user-photos/{sessionId}/{customerId}/{photoType}-{timestamp}.{ext}
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    // Clean customerId - remove any invalid characters and handle empty string
    const cleanCustomerId = customerId?.trim() || null;
    const customerPrefix = cleanCustomerId ? `${cleanCustomerId}/` : '';
    const key = `user-photos/${sessionId}/${customerPrefix}${photoType}-${timestamp}.${fileExt}`;

    logger.info('Uploading photo to S3', {
      key,
      photoType,
      sessionId,
      customerId: customerId || 'anonymous',
      size: file.size,
      type: file.type,
    });

    // Upload to S3
    const s3Url = await uploadFileToS3(key, file);

    logger.info('Photo uploaded successfully', {
      key,
      s3Url,
      photoType,
    });

    // Get shopDomain from session to find organization
    // For demo purposes, if session doesn't exist, create/update a demo session
    let [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);

    // For demo: if no session exists, create one with demo data
    if (!session) {
      logger.info('Session not found, creating demo session for photo upload', { sessionId });
      
      // Get organization for the shop domain (use default if not found)
      const defaultShopDomain = shopDomain || 'test-store.myshopify.com';
      const org = await getOrganizationByShopDomain(defaultShopDomain).catch(() => null);
      
      try {
        // Create a demo session for storing photos
        await db.insert(sessions).values({
          sessionId,
          shopDomain: defaultShopDomain,
          organizationName: org?.organizationName || 'Test Store',
          customerId: customerId || null, // Allow null for demo
          customerEmail: null, // Allow null for demo
          lastActivityAt: new Date(),
        });
        
        // Fetch the newly created session
        [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.sessionId, sessionId))
          .limit(1);
          
        logger.info('Demo session created for photo upload', { sessionId });
      } catch (createError: any) {
        logger.error('Failed to create demo session', createError);
        // Continue anyway - we'll try to update if session exists later
      }
    }

    if (session) {
      // Get organizationName
      const org = await getOrganizationByShopDomain(session.shopDomain);
      const organizationName = org?.organizationName || session.organizationName || 'Unknown';

      // Update session with photo URL - linked to customerId/email for privacy
      const updateData: any = {
        lastActivityAt: new Date(),
        organizationName,
      };

      // Update the appropriate photo field based on photoType
      if (photoType === 'standing') {
        updateData.standingPhotoUrl = s3Url;
      } else if (photoType === 'portrait') {
        updateData.portraitPhotoUrl = s3Url;
      }

      // Set as active photo if requested (when user clicks Save)
      if (setAsActive) {
        updateData.userPhotoUrl = s3Url;
      } else {
        // Auto-set as userPhotoUrl if it's the first photo uploaded
        if (!session.userPhotoUrl) {
          updateData.userPhotoUrl = s3Url;
        }
      }

      // Also update customerId if provided (for privacy - ensure photos are linked to user)
      if (customerId && session.customerId !== customerId) {
        updateData.customerId = customerId;
      }

      await db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.sessionId, sessionId));

      logger.info('Session updated with photo URL', {
        sessionId,
        photoType,
        customerId: customerId || session.customerId,
        customerEmail: session.customerEmail,
        s3Url,
      });
    } else {
      logger.warn('Session not found for photo upload', { sessionId });
    }

    // Ensure all values are JSON serializable (convert to strings/null)
    const responseData = {
      success: true,
      url: s3Url,
      key,
      photoType,
      customerId: (customerId || session?.customerId || null) as string | null,
      customerEmail: (session?.customerEmail || null) as string | null,
      setAsActive: setAsActive || false,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    logger.error('Photo upload error', {
      error: error.message || String(error),
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    
    // Ensure error response is JSON serializable
    const errorMessage = error.message || 'Failed to upload photo';
    const errorCode = error.code || 'UPLOAD_ERROR';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      { status: error.statusCode || 500 }
    );
  }
}

