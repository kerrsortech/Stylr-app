/**
 * Blob Storage Adapter
 * Wraps S3 storage to match Vercel Blob API for compatibility
 */

import { uploadFileToS3 } from "./s3-storage";

/**
 * Upload file to blob storage (S3)
 * Matches Vercel Blob API signature
 */
export async function put(
  pathname: string,
  file: File | Blob,
  options?: {
    access?: "public" | "private";
    contentType?: string;
  }
): Promise<{ url: string }> {
  // Convert Blob to File if needed
  let fileToUpload: File;
  if (file instanceof File) {
    fileToUpload = file;
  } else {
    // Convert Blob to File
    fileToUpload = new File([file], pathname.split("/").pop() || "file.jpg", {
      type: options?.contentType || file.type || "image/jpeg",
    });
  }

  // Upload to S3
  const url = await uploadFileToS3(pathname, fileToUpload);

  return { url };
}

