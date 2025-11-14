import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByAdminEmail } from '@/lib/database/organization-queries';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/database/db';
import { brandGuidelines } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { uploadToS3, deleteFromS3 } from '@/lib/storage/s3-storage';

const UploadBrandGuidelinesSchema = z.object({
  adminEmail: z.string().email(),
  fileType: z.enum(['brand_guidelines', 'about_brand']),
  fileName: z.string().min(1),
  fileContent: z.string(), // Base64 encoded file content
  mimeType: z.string(),
  aboutBrandText: z.string().optional(), // Optional text content for about brand
});

// GET - Get brand guidelines
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

    const [guidelines] = await db
      .select()
      .from(brandGuidelines)
      .where(eq(brandGuidelines.shopDomain, org.shopDomain))
      .limit(1);

    return NextResponse.json({ guidelines: guidelines || null });
  } catch (error: any) {
    logger.error('Get brand guidelines error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

// POST - Upload brand guidelines or about brand file
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = UploadBrandGuidelinesSchema.parse(body);

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
    const s3Key = `brand-guidelines/${org.shopDomain}/${data.fileType}/${timestamp}_${sanitizedFileName}`;

    // Upload to S3
    const fileUrl = await uploadToS3(s3Key, fileBuffer, data.mimeType);

    // Check if brand guidelines record exists
    const [existing] = await db
      .select()
      .from(brandGuidelines)
      .where(eq(brandGuidelines.shopDomain, org.shopDomain))
      .limit(1);

    let guidelines;

    if (existing) {
      // Update existing record
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.fileType === 'brand_guidelines') {
        // Delete old file if exists
        if (existing.brandGuidelinesPath) {
          await deleteFromS3(existing.brandGuidelinesPath);
        }
        updateData.brandGuidelinesPath = s3Key;
        updateData.brandGuidelinesUrl = fileUrl;
        updateData.brandGuidelinesFileName = data.fileName;
      } else if (data.fileType === 'about_brand') {
        // Delete old file if exists
        if (existing.aboutBrandPath) {
          await deleteFromS3(existing.aboutBrandPath);
        }
        updateData.aboutBrandPath = s3Key;
        updateData.aboutBrandUrl = fileUrl;
        updateData.aboutBrandFileName = data.fileName;
        if (data.aboutBrandText) {
          updateData.aboutBrand = data.aboutBrandText;
        }
      }

      [guidelines] = await db
        .update(brandGuidelines)
        .set(updateData)
        .where(eq(brandGuidelines.shopDomain, org.shopDomain))
        .returning();
    } else {
      // Create new record
      const insertData: any = {
        shopDomain: org.shopDomain,
        organizationName: org.organizationName,
      };

      if (data.fileType === 'brand_guidelines') {
        insertData.brandGuidelinesPath = s3Key;
        insertData.brandGuidelinesUrl = fileUrl;
        insertData.brandGuidelinesFileName = data.fileName;
      } else if (data.fileType === 'about_brand') {
        insertData.aboutBrandPath = s3Key;
        insertData.aboutBrandUrl = fileUrl;
        insertData.aboutBrandFileName = data.fileName;
        if (data.aboutBrandText) {
          insertData.aboutBrand = data.aboutBrandText;
        }
      }

      [guidelines] = await db
        .insert(brandGuidelines)
        .values(insertData)
        .returning();
    }

    return NextResponse.json({ guidelines }, { status: 201 });
  } catch (error: any) {
    logger.error('Upload brand guidelines error', error);
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

// DELETE - Delete brand guidelines file
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');
    const fileType = searchParams.get('fileType'); // 'brand_guidelines' | 'about_brand'

    if (!adminEmail || !fileType) {
      return NextResponse.json(
        { error: 'adminEmail and fileType are required' },
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

    // Get guidelines record
    const [guidelines] = await db
      .select()
      .from(brandGuidelines)
      .where(eq(brandGuidelines.shopDomain, org.shopDomain))
      .limit(1);

    if (!guidelines) {
      return NextResponse.json(
        { error: 'Brand guidelines not found' },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Delete from S3 and clear database field
    if (fileType === 'brand_guidelines' && guidelines.brandGuidelinesPath) {
      await deleteFromS3(guidelines.brandGuidelinesPath);
      updateData.brandGuidelinesPath = null;
      updateData.brandGuidelinesUrl = null;
      updateData.brandGuidelinesFileName = null;
    } else if (fileType === 'about_brand' && guidelines.aboutBrandPath) {
      await deleteFromS3(guidelines.aboutBrandPath);
      updateData.aboutBrandPath = null;
      updateData.aboutBrandUrl = null;
      updateData.aboutBrandFileName = null;
      updateData.aboutBrand = null;
    }

    await db
      .update(brandGuidelines)
      .set(updateData)
      .where(eq(brandGuidelines.shopDomain, org.shopDomain));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Delete brand guidelines error', error);
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}


