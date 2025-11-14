import Replicate from 'replicate';
import { logger } from '@/lib/utils/logger';
import { createServerError } from '@/lib/utils/error-handler';

export class ReplicateClient {
  private client: Replicate;

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error('Replicate API token is required');
    }
    this.client = new Replicate({ auth: apiToken });
  }

  /**
   * Generate virtual try-on image
   */
  async generateTryOnImage(
    userPhotoUrl: string,
    productImageUrl: string,
    prompt: string
  ): Promise<string> {
    const startTime = Date.now();
    try {
      const input = {
        size: '2K',
        width: 2048,
        height: 2048,
        prompt: prompt,
        max_images: 1,
        image_input: [userPhotoUrl, productImageUrl],
        aspect_ratio: '4:3',
        sequential_image_generation: 'disabled',
      };

      logger.info('Calling Replicate Seedream-4', {
        userPhotoUrl: userPhotoUrl.substring(0, 50) + '...',
        productImageUrl: productImageUrl.substring(0, 50) + '...',
        promptLength: prompt.length,
      });

      const output = await this.client.run(
        'bytedance/seedream-4',
        { input }
      ) as any;

      const duration = Date.now() - startTime;
      logger.performance('replicate.generateTryOn', duration, {
        promptLength: prompt.length,
      });

      // Extract image URL from output
      if (Array.isArray(output) && output.length > 0) {
        const firstItem = output[0];
        if (typeof firstItem === 'string') {
          return firstItem;
        } else if (firstItem && typeof firstItem === 'object') {
          if (typeof firstItem.url === 'function') {
            return await firstItem.url();
          } else if (firstItem.url) {
            return String(firstItem.url);
          }
        }
      }

      logger.error('Unexpected Replicate output format', null, { output });
      throw createServerError('Failed to generate image', 'REPLICATE_OUTPUT_ERROR');
    } catch (error: any) {
      logger.error('Replicate API error', error, {
        operation: 'generateTryOnImage',
        userPhotoUrl: userPhotoUrl.substring(0, 50) + '...',
      });
      throw createServerError('Failed to generate try-on image', 'REPLICATE_ERROR');
    }
  }
}

