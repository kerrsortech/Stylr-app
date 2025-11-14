import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { sessions } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { sanitizeErrorForClient } from '@/lib/utils/error-handler';
import { DEMO_PORTRAIT_PHOTO_URL } from '@/lib/config/demo-photos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userPhotoUrl, customerId } = body;

    if (!sessionId || !userPhotoUrl) {
      return NextResponse.json(
        { error: 'sessionId and userPhotoUrl are required' },
        { status: 400 }
      );
    }

    // Get existing session
    let [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);

    // For demo: create session if it doesn't exist
    if (!session) {
      logger.info('Session not found, creating demo session for photo update', { sessionId });
      
      try {
        // Create a demo session
        await db.insert(sessions).values({
          sessionId,
          shopDomain: 'test-store.myshopify.com',
          organizationName: 'Test Store',
          customerId: customerId || null,
          customerEmail: null,
          lastActivityAt: new Date(),
        });
        
        // Fetch the newly created session
        [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.sessionId, sessionId))
          .limit(1);
          
        logger.info('Demo session created for photo update', { sessionId });
      } catch (createError: any) {
        logger.error('Failed to create demo session', createError);
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify the photo URL belongs to this session (privacy check)
    // For demo: allow demo photo URL to be set
    const isDemoPhoto = userPhotoUrl?.includes('vvapp.s3.ap-south-1.amazonaws.com');
    const isValidPhoto = 
      isDemoPhoto || // Allow demo photo
      session.standingPhotoUrl === userPhotoUrl || 
      session.portraitPhotoUrl === userPhotoUrl;

    if (!isValidPhoto) {
      return NextResponse.json(
        { error: 'Photo URL does not belong to this session' },
        { status: 403 }
      );
    }

    // Update session with selected photo URL
    const updateData: any = {
      userPhotoUrl,
      lastActivityAt: new Date(),
    };

    // For demo: if it's the demo portrait photo, also save it to portraitPhotoUrl
    if (isDemoPhoto && userPhotoUrl === DEMO_PORTRAIT_PHOTO_URL) {
      updateData.portraitPhotoUrl = DEMO_PORTRAIT_PHOTO_URL;
    }

    // Also update customerId if provided (for privacy)
    if (customerId && session.customerId !== customerId) {
      updateData.customerId = customerId;
    }

    await db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.sessionId, sessionId));

    logger.info('User photo URL updated in session', {
      sessionId,
      userPhotoUrl,
      customerId: customerId || session.customerId,
      customerEmail: session.customerEmail,
    });

    return NextResponse.json({
      success: true,
      userPhotoUrl,
      customerId: customerId || session.customerId,
      customerEmail: session.customerEmail,
    });
  } catch (error: any) {
    logger.error('Update user photo error', error);
    const sanitizedError = sanitizeErrorForClient(error);
    return NextResponse.json(sanitizedError, { status: 500 });
  }
}

