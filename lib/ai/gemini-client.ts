import Replicate from 'replicate';
import { logger } from '@/lib/utils/logger';
import { createServerError } from '@/lib/utils/error-handler';

/**
 * GeminiClient using Replicate API instead of Google Cloud API
 * Uses google/gemini-2.5-flash model via Replicate
 */
export class GeminiClient {
  private client: Replicate;
  // Use Replicate model identifier for Gemini 2.5 Flash
  private model: string = process.env.GEMINI_MODEL || 'google/gemini-2.5-flash';

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error('Replicate API token is required');
    }
    this.client = new Replicate({ auth: apiToken });
  }

  /**
   * Generate text completion
   */
  async generateText(
    prompt: string,
    config?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const startTime = Date.now();
    try {
      // Replicate's Gemini model expects 'prompt' field, not 'messages'
      const input = {
        prompt: prompt,
          temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 1024,
      };

      const output = await this.client.run(this.model as `${string}/${string}`, { input }) as any;

      const duration = Date.now() - startTime;
      logger.performance('gemini.generateText', duration, {
        promptLength: prompt.length,
        temperature: config?.temperature,
        model: this.model,
      });

      // Replicate returns the response as a string, array of chunks, or object
      let textResponse: string = '';
      
      if (typeof output === 'string') {
        textResponse = output;
      } else if (Array.isArray(output)) {
        // If it's an array, concatenate all chunks to get the full response
        textResponse = output.map(chunk => String(chunk)).join('');
      } else if (output && typeof output === 'object') {
        // Try different possible properties
        if (output.text) {
          textResponse = String(output.text);
        } else if (output.content) {
          textResponse = String(output.content);
        } else if (output.response) {
          textResponse = String(output.response);
        } else {
          // If it's an object but we don't recognize the format, try to stringify it
          textResponse = JSON.stringify(output);
        }
      } else {
        textResponse = String(output);
      }

      // Log if response seems truncated (for debugging)
      if (textResponse.length < 50) {
        logger.warn('Replicate response seems very short', {
          responseLength: textResponse.length,
          response: textResponse.substring(0, 200),
          outputType: typeof output,
          isArray: Array.isArray(output),
          model: this.model,
        });
      }

      if (!textResponse || textResponse.trim().length === 0) {
        logger.error('Empty response from Replicate', new Error('Empty response'), { 
          output,
          outputType: typeof output,
          isArray: Array.isArray(output),
          model: this.model,
        });
        throw createServerError('Empty response from Replicate', 'REPLICATE_EMPTY_RESPONSE');
      }

      return textResponse;
    } catch (error: any) {
      logger.error('Gemini API error (via Replicate)', error, {
        operation: 'generateText',
        promptLength: prompt.length,
        model: this.model,
      });
      throw createServerError('Failed to generate response', 'GEMINI_ERROR');
    }
  }

  /**
   * Generate with conversation history
   * Uses Replicate API with message history
   */
  async chat(
    messages: Array<{ role: 'user' | 'model'; content: string }>,
    newMessage: string,
    config?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Replicate's Gemini model expects 'prompt' field
      // Combine conversation history and new message into a single prompt
      const conversationText = messages
        .map(msg => {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          return `${role}: ${msg.content}`;
        })
        .join('\n\n');
      
      const fullPrompt = conversationText 
        ? `${conversationText}\n\nUser: ${newMessage}\n\nAssistant:`
        : newMessage; // Use raw newMessage as prompt (it already contains the full context)

      logger.info('Calling Replicate API', {
        model: this.model,
        promptLength: fullPrompt.length,
        temperature: config?.temperature ?? 0.7,
      });

      const input = {
        prompt: fullPrompt,
        temperature: config?.temperature ?? 0.7,
        // Note: max_tokens is not supported by Replicate's Gemini model
        // The model will use its default token limit
      };

      const output = await this.client.run(this.model as `${string}/${string}`, { input }) as any;

      const duration = Date.now() - startTime;
      logger.performance('gemini.chat', duration, {
        messageCount: messages.length,
        newMessageLength: newMessage.length,
        model: this.model,
      });

      logger.info('Replicate API response received', {
        outputType: typeof output,
        isArray: Array.isArray(output),
        arrayLength: Array.isArray(output) ? output.length : undefined,
        hasText: output && typeof output === 'object' ? !!output.text : undefined,
        hasContent: output && typeof output === 'object' ? !!output.content : undefined,
        model: this.model,
      });

      // Replicate returns the response as a string, array of chunks, or object
      let textResponse: string = '';
      
      if (typeof output === 'string') {
        textResponse = output;
      } else if (Array.isArray(output)) {
        // If it's an array, concatenate all chunks to get the full response
        textResponse = output.map(chunk => String(chunk)).join('');
      } else if (output && typeof output === 'object') {
        // Try different possible properties
        if (output.text) {
          textResponse = String(output.text);
        } else if (output.content) {
          textResponse = String(output.content);
        } else if (output.response) {
          textResponse = String(output.response);
        } else if (output.message) {
          textResponse = String(output.message);
        } else {
          // Log unrecognized format
          logger.warn('Unrecognized Replicate output format', {
            outputKeys: Object.keys(output),
            outputSample: JSON.stringify(output).substring(0, 200),
            model: this.model,
          });
          // If it's an object but we don't recognize the format, try to stringify it
          textResponse = JSON.stringify(output);
        }
      } else {
        textResponse = String(output);
      }

      if (!textResponse || textResponse.trim().length === 0) {
        logger.error('Empty response from Replicate', new Error('Empty response'), {
          output: JSON.stringify(output).substring(0, 500),
          outputType: typeof output,
          isArray: Array.isArray(output),
          model: this.model,
        });
        throw createServerError('Empty response from Replicate', 'REPLICATE_EMPTY_RESPONSE');
      }

      logger.info('Gemini response parsed successfully', {
        responseLength: textResponse.length,
        model: this.model,
      });

      return textResponse;
    } catch (error: any) {
      const status = error.status || error.statusCode || 0;
      const isRateLimited = status === 429 || 
                           error.message?.includes('429') ||
                           error.message?.includes('rate limit') ||
                           error.message?.includes('throttled');
      
      // Log detailed error information
      logger.error('Gemini chat error (via Replicate)', error, {
        errorType: typeof error,
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : undefined,
        operation: 'chat',
        messageCount: messages.length,
        model: this.model,
      });
        
      // Return user-friendly error message for rate limits
      if (isRateLimited) {
        throw createServerError(
          'The AI service is currently experiencing high demand. Please try again in a few moments.',
          'RATE_LIMIT_EXCEEDED'
        );
      }
    
      // Generic error for other failures
      const errorMessage = error.message || 'Failed to process chat message';
      throw createServerError(errorMessage, 'AI_ERROR');
    }
  }

  /**
   * Analyze images with text prompt
   */
  async analyzeImages(
    prompt: string,
    images: Array<{ data: string; mimeType: string }>,
    config?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const startTime = Date.now();
    try {
      // Replicate's Gemini model expects 'prompt' field
      // For images, we include them as base64 data URLs in the prompt
      // Note: Replicate may require images to be passed differently - check their docs
      const imageDataUrls = images.map(img => img.data).join('\n');
      const fullPrompt = `${prompt}\n\n[Images provided: ${images.length} image(s)]`;

      const input = {
        prompt: fullPrompt,
          temperature: config?.temperature ?? 0.0,
        max_tokens: config?.maxTokens ?? 768,
        // If Replicate supports images separately, add them here
        // images: images.map(img => img.data),
      };

      const output = await this.client.run(this.model as `${string}/${string}`, { input }) as any;

      const duration = Date.now() - startTime;
      logger.performance('gemini.analyzeImages', duration, {
        imageCount: images.length,
        promptLength: prompt.length,
        model: this.model,
      });

      // Replicate returns the response as a string, array of chunks, or object
      let textResponse: string = '';
      
      if (typeof output === 'string') {
        textResponse = output;
      } else if (Array.isArray(output)) {
        // If it's an array, concatenate all chunks to get the full response
        textResponse = output.map(chunk => String(chunk)).join('');
      } else if (output && typeof output === 'object') {
        // Try different possible properties
        if (output.text) {
          textResponse = String(output.text);
        } else if (output.content) {
          textResponse = String(output.content);
        } else if (output.response) {
          textResponse = String(output.response);
        } else {
          // If it's an object but we don't recognize the format, try to stringify it
          textResponse = JSON.stringify(output);
        }
      } else {
        textResponse = String(output);
      }

      if (!textResponse || textResponse.trim().length === 0) {
        logger.error('Empty response from Replicate', new Error('Empty response'), { 
          output,
          outputType: typeof output,
          isArray: Array.isArray(output),
          model: this.model,
        });
        throw createServerError('Empty response from Replicate', 'REPLICATE_EMPTY_RESPONSE');
      }

      return textResponse;
    } catch (error: any) {
      logger.error('Gemini image analysis error (via Replicate)', error, {
        operation: 'analyzeImages',
        imageCount: images.length,
        model: this.model,
      });
      throw createServerError('Failed to analyze images', 'GEMINI_IMAGE_ERROR');
    }
  }

  /**
   * Fix common JSON issues (single quotes, trailing commas, etc.)
   */
  private fixJSON(jsonString: string): string {
    let fixed = jsonString.trim();
    
    // Remove markdown code blocks if present
    fixed = fixed
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Try to extract JSON object if embedded in text
    const jsonMatch = fixed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      fixed = jsonMatch[0];
    }
    
    // Fix common issues:
    // 1. Replace single quotes with double quotes for keys and string values
    // 2. Remove trailing commas
    // 3. Fix unquoted keys (if any)
    
    // Replace single-quoted keys: 'key': -> "key":
    // Match pattern: whitespace or { or , followed by 'key': followed by :
    fixed = fixed.replace(/([{,\s])'([^']+)':/g, '$1"$2":');
    
    // Replace single-quoted string values: : 'value' -> : "value"
    // Match pattern: : followed by whitespace and 'value'
    fixed = fixed.replace(/:\s*'([^']*)'/g, ': "$1"');
    
    // Remove trailing commas before } or ]
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    return fixed;
  }

  /**
   * Extract structured JSON from response
   */
  async generateJSON<T>(
    prompt: string,
    config?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<T> {
    try {
      const text = await this.generateText(prompt, {
        ...config,
        temperature: config?.temperature ?? 0.0, // Lower temperature for structured output
      });

      // Try parsing the cleaned text directly first
      try {
        const cleaned = text.trim();
        return JSON.parse(cleaned) as T;
      } catch (firstError) {
        // If that fails, try with markdown removal
        try {
          const cleaned = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          return JSON.parse(cleaned) as T;
        } catch (secondError) {
          // If that fails, try fixing common JSON issues
          try {
            const fixed = this.fixJSON(text);
            return JSON.parse(fixed) as T;
          } catch (thirdError) {
            // Last attempt: extract JSON object and fix it
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const fixed = this.fixJSON(jsonMatch[0]);
                return JSON.parse(fixed) as T;
              } catch (fourthError) {
                logger.error('Failed to parse JSON from Gemini (all attempts failed, via Replicate)', fourthError, {
                  response: text.substring(0, 1000),
                  responseLength: text.length,
                  extractedJson: jsonMatch ? jsonMatch[0].substring(0, 500) : null,
                  fixedJson: this.fixJSON(jsonMatch?.[0] || text).substring(0, 500),
                  model: this.model,
                });
                throw createServerError('Failed to parse response', 'JSON_PARSE_ERROR');
              }
            }
            
            logger.error('Failed to parse JSON from Gemini (via Replicate)', thirdError, {
              response: text.substring(0, 1000),
              responseLength: text.length,
              fixedJson: this.fixJSON(text).substring(0, 500),
              model: this.model,
            });
            throw createServerError('Failed to parse response', 'JSON_PARSE_ERROR');
          }
        }
      }
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('JSON_PARSE_ERROR')) {
        throw error;
      }
      logger.error('Gemini JSON generation error (via Replicate)', error, {
        operation: 'generateJSON',
        model: this.model,
      });
      throw createServerError('Failed to generate structured response', 'GEMINI_JSON_ERROR');
    }
  }
}

