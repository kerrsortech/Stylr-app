# Vercel Deployment Guide

This document outlines the deployment requirements and edge cases handled for Vercel production deployment.

## Environment Variables Required

Set these in your Vercel project settings:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://...

# AWS S3 (for image uploads)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1  # or your preferred region
AWS_S3_BUCKET=your-bucket-name

# Replicate API (for virtual try-on)
REPLICATE_API_TOKEN=your_replicate_token

# Redis (optional, for caching)
REDIS_URL=redis://...

# Email (optional, for notifications)
SENDGRID_API_KEY=your_sendgrid_key
ADMIN_EMAIL=admin@yourdomain.com
```

### Optional Variables

```bash
# API URL (only set if you need a custom domain)
# Leave unset for automatic detection
NEXT_PUBLIC_API_URL=https://your-domain.com
```

## Image Handling in Production

### Public Folder Images

Images in the `public/` folder are automatically served by Next.js in production:
- `/Portrait Photo.jpg` → Accessible at `https://your-domain.com/Portrait Photo.jpg`
- `/Standing Photo.jpg` → Accessible at `https://your-domain.com/Standing Photo.jpg`
- `/Product_images/*.jpg` → Accessible at `https://your-domain.com/Product_images/*.jpg`

**No additional configuration needed** - Next.js handles this automatically.

### URL Construction

The code uses `lib/utils/url-helper.ts` to handle URL construction:

- **Development**: Uses `window.location.origin` (localhost:3000)
- **Production (Vercel)**: 
  - Automatically detects Vercel URL from `VERCEL_URL` env var
  - Falls back to `NEXT_PUBLIC_API_URL` if set
  - Uses `window.location.origin` as final fallback

### Image Fetching

When fetching images for try-on:
1. **Local public images**: Fetched using absolute URLs constructed from base URL
2. **S3 images**: Proxied through `/api/proxy-image` to avoid CORS issues
3. **External images**: Handled through proxy endpoint

## Edge Cases Handled

### 1. URL Construction
- ✅ Works in both client and server contexts
- ✅ Automatically detects Vercel deployment
- ✅ Handles custom domains
- ✅ Falls back gracefully if env vars missing

### 2. Image Access
- ✅ Public folder images accessible in production
- ✅ S3 images proxied correctly
- ✅ CORS issues handled via proxy endpoint
- ✅ File objects created with correct MIME types

### 3. File Uploads
- ✅ S3 uploads work via environment variables
- ✅ File validation ensures correct formats
- ✅ Error handling for failed uploads

### 4. Virtual Try-On Flow
- ✅ Images uploaded to S3 get public URLs
- ✅ URLs sent to Replicate API correctly
- ✅ Works with both uploaded and demo photos
- ✅ Handles product images from public folder

## Testing After Deployment

1. **Test Demo Photos**:
   - Open try-on dialog
   - Verify both portrait and standing photos load
   - Check browser console for any errors

2. **Test Image Upload**:
   - Upload a standing photo
   - Upload a portrait photo
   - Verify images appear in preview
   - Check S3 bucket for uploaded files

3. **Test Virtual Try-On**:
   - Select a product
   - Click "Try Virtual Try-On"
   - Verify correct photo is selected (standing vs portrait)
   - Check that try-on generation completes

4. **Test Product Images**:
   - Browse products
   - Verify product images load from `/Product_images/`
   - Test try-on with different product categories

## Troubleshooting

### Images Not Loading

1. Check that images exist in `public/` folder
2. Verify file names match exactly (case-sensitive)
3. Check browser console for 404 errors
4. Verify `NEXT_PUBLIC_API_URL` is not set incorrectly

### S3 Uploads Failing

1. Verify AWS credentials are set in Vercel
2. Check S3 bucket permissions
3. Verify bucket region matches `AWS_REGION`
4. Check Vercel function logs for errors

### Try-On Not Working

1. Verify `REPLICATE_API_TOKEN` is set
2. Check that images are being uploaded to S3
3. Verify S3 URLs are publicly accessible
4. Check Replicate API logs for errors

## Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Public folder images committed to repository
- [ ] S3 bucket configured with correct permissions
- [ ] Replicate API token valid
- [ ] Test image uploads work
- [ ] Test virtual try-on works
- [ ] Test demo photos load correctly
- [ ] Test product images load correctly

## Notes

- Public folder is deployed automatically with your Next.js app
- No CDN configuration needed - Vercel handles this
- Images are cached automatically by Vercel
- S3 uploads work the same in dev and production
- URL helper automatically handles Vercel's dynamic URLs

