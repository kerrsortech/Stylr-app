import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/lib/utils/logger';
import { createServerError } from '@/lib/utils/error-handler';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not set');
    }

    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3Client;
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  key: string,
  file: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const startTime = Date.now();
  const bucket = process.env.AWS_S3_BUCKET; // Move outside try block for error handler access
  
  if (!bucket) {
    throw createServerError('AWS_S3_BUCKET environment variable is not set', 'S3_CONFIG_ERROR');
  }

  try {
    const client = getS3Client();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await client.send(command);

    const duration = Date.now() - startTime;
    logger.performance('s3.upload', duration, { key, size: file.length });

    // Return public URL
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (error: any) {
    // Provide more specific error message
    let errorMessage = 'Failed to upload file to S3';
    if (error.code === 'CredentialsError' || error.message?.includes('credentials')) {
      errorMessage = 'AWS credentials are invalid or missing';
    } else if (error.code === 'NoSuchBucket' || error.message?.includes('bucket')) {
      errorMessage = 'S3 bucket does not exist or is not accessible';
    } else if (error.message) {
      errorMessage = `S3 upload failed: ${error.message}`;
    }
    
    logger.error('S3 upload error', {
      error: error.message || String(error),
      stack: error.stack,
      name: error.name,
      code: error.code,
      key,
      bucket,
      contentType,
      fileSize: file.length,
    });
    
    throw createServerError(errorMessage, 'S3_UPLOAD_ERROR');
  }
}

/**
 * Get signed URL for file access
 */
export async function getSignedUrlForFile(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      throw new Error('AWS_S3_BUCKET is not set');
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn });
  } catch (error: any) {
    logger.error('S3 signed URL error', error, { key });
    throw createServerError('Failed to generate file URL', 'S3_URL_ERROR');
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      throw new Error('AWS_S3_BUCKET is not set');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    logger.info('File deleted from S3', { key });
  } catch (error: any) {
    logger.error('S3 delete error', error, { key });
    // Don't throw - deletion failures are not critical
  }
}

/**
 * Upload file from File object
 */
export async function uploadFileToS3(
  key: string,
  file: File
): Promise<string> {
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file: file is empty or undefined');
    }

    // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Invalid file: arrayBuffer is empty');
    }

  const buffer = Buffer.from(arrayBuffer);
    
    // Validate content type
    const contentType = file.type || 'application/octet-stream';
    
    // Clean the key - remove any invalid characters
    const cleanKey = key.replace(/[^a-zA-Z0-9/._-]/g, '_');
    
    return uploadToS3(cleanKey, buffer, contentType);
  } catch (error: any) {
    logger.error('uploadFileToS3 error', error, { 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      key 
    });
    throw error;
  }
}

/**
 * Read file content from S3 using the S3 key
 */
export async function readFileFromS3(key: string): Promise<string> {
  try {
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      throw new Error('AWS_S3_BUCKET is not set');
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);
    
    if (!response.Body) {
      throw new Error('Empty response body from S3');
    }

    // Convert stream to string
    // @ts-ignore - Body can be Readable stream or Blob
    const stream = response.Body;
    const chunks: Buffer[] = [];
    
    // Handle different response body types
    if (stream instanceof ReadableStream) {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
    } else if (stream instanceof Uint8Array) {
      chunks.push(Buffer.from(stream));
    } else {
      // For Node.js Readable stream
      for await (const chunk of stream as any) {
        chunks.push(Buffer.from(chunk));
      }
    }

    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  } catch (error: any) {
    logger.error('S3 file read error', error, { key });
    throw createServerError('Failed to read file from S3', 'S3_READ_ERROR');
  }
}

/**
 * Read file content from S3 URL (extracts key from URL)
 */
export async function readFileFromS3Url(url: string): Promise<string> {
  try {
    // Extract S3 key from URL
    // URL format: https://bucket.s3.region.amazonaws.com/key
    const urlObj = new URL(url);
    const key = urlObj.pathname.substring(1); // Remove leading slash
    
    return await readFileFromS3(key);
  } catch (error: any) {
    logger.error('S3 file read error from URL', error, { url });
    throw createServerError('Failed to read file from S3 URL', 'S3_READ_ERROR');
  }
}

