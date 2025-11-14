import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { policyFiles } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { uploadToS3, deleteFromS3 } from '@/lib/storage/s3-storage';

const UploadPolicySchema = z.object({
  adminEmail: z.string().email(),
  policyType: z.enum(['shipping', 'return', 'refund', 'privacy', 'terms', 'custom']),
  fileName: z.string().min(1),
  fileContent: z.string(), // Base64 encoded file content
  mimeType: z.string(),
});

// GET - List policy files
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'adminEmail is required' },
        { status: 400 }
      );
    }

    const org = await getOrganizationByAdminEmail(adminEmail);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const files = await db
      .select()
      .from(policyFiles)
      .where(eq(policyFiles.shopDomain, org.shopDomain))
      .orderBy(policyFiles.uploadedAt);

    return NextResponse.json({ files });
  } catch (error: any) {
    logger.error('List policy files error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

// POST - Upload policy file
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = UploadPolicySchema.parse(body);

    const org = await getOrganizationByAdminEmail(data.adminEmail);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Decode base64 file content
    const fileBuffer = Buffer.from(data.fileContent, 'base64');
    
    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `policies/${org.shopDomain}/${data.policyType}/${timestamp}_${sanitizedFileName}`;

    // Upload to S3
    const fileUrl = await uploadToS3(s3Key, fileBuffer, data.mimeType);

    // Save to database
    const [file] = await db
      .insert(policyFiles)
      .values({
        shopDomain: org.shopDomain,
        organizationName: org.organizationName,
        policyType: data.policyType,
        fileName: data.fileName,
        filePath: s3Key,
        fileUrl: fileUrl,
        fileSize: fileBuffer.length,
        mimeType: data.mimeType,
      })
      .returning();

    return NextResponse.json({ file }, { status: 201 });
  } catch (error: any) {
    logger.error('Upload policy file error', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

// DELETE - Delete policy file
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');
    const fileId = searchParams.get('fileId');

    if (!adminEmail || !fileId) {
      return NextResponse.json(
        { error: 'adminEmail and fileId are required' },
        { status: 400 }
      );
    }

    const org = await getOrganizationByAdminEmail(adminEmail);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get file record
    const [file] = await db
      .select()
      .from(policyFiles)
      .where(
        and(
          eq(policyFiles.id, parseInt(fileId)),
          eq(policyFiles.shopDomain, org.shopDomain)
        )
      )
      .limit(1);

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete from S3
    await deleteFromS3(file.filePath);

    // Delete from database
    await db
      .delete(policyFiles)
      .where(eq(policyFiles.id, parseInt(fileId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Delete policy file error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

