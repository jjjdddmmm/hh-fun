// Cloudinary OCR Service
// Handles text extraction using Cloudinary's OCR add-on powered by Google Vision AI

import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@/lib/utils/logger';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  logger.error('Missing Cloudinary configuration', {
    hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
    hasApiKey: !!process.env.CLOUDINARY_API_KEY,
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
  });
}

export interface OCRResult {
  success: boolean;
  text: string;
  confidence?: number;
  processingTimeMs: number;
  error?: string;
  metadata?: {
    textBlocks?: number;
    language?: string;
    orientation?: string;
  };
}

export class CloudinaryOCRService {
  private readonly timeout = 30000; // 30 second timeout

  /**
   * Extract text from document using Cloudinary OCR
   */
  async extractText(publicId: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Starting Cloudinary OCR extraction via update', { publicId });

      // Use update API to apply OCR to existing asset per Cloudinary docs
      const result = await new Promise((resolve, reject) => {
        cloudinary.api.update(publicId, {
          ocr: 'adv_ocr'
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

      const processingTimeMs = Date.now() - startTime;

      logger.debug('OCR update response received', { 
        publicId, 
        processingTimeMs,
        hasInfo: !!(result as any)?.info,
        hasOcr: !!(result as any)?.info?.ocr
      });

      // Parse OCR response from upload result
      const ocrResult = this.parseOCRResponse((result as any)?.info?.ocr, processingTimeMs);
      
      logger.info('Cloudinary OCR extraction completed', {
        success: ocrResult.success,
        textLength: ocrResult.text.length,
        processingTimeMs: ocrResult.processingTimeMs,
        confidence: ocrResult.confidence
      });

      return ocrResult;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'OCR extraction failed';
      
      logger.error('Cloudinary OCR extraction failed', error, { 
        publicId, 
        processingTimeMs 
      });

      return {
        success: false,
        text: '',
        processingTimeMs,
        error: errorMessage
      };
    }
  }

  /**
   * Extract text directly from buffer by uploading to Cloudinary first
   */
  async extractTextFromBuffer(
    fileBuffer: Buffer, 
    options: { fileName?: string; folder?: string } = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Uploading buffer for OCR extraction', { 
        fileSize: fileBuffer.length,
        fileName: options.fileName 
      });

      // Upload with OCR applied - OCR data will be in the upload response
      const uploadResult = await this.uploadForOCR(fileBuffer, options);
      
      logger.debug('Upload completed, parsing OCR from response', { 
        publicId: uploadResult.public_id,
        hasInfo: !!uploadResult.info,
        hasOcr: !!uploadResult.info?.ocr
      });

      // Parse OCR data directly from upload response
      const ocrResult = this.parseOCRResponse(uploadResult.info?.ocr, Date.now() - startTime);
      
      // Clean up temporary upload (optional - Cloudinary auto-expires temp files)
      try {
        await cloudinary.uploader.destroy(uploadResult.public_id);
        logger.debug('Temporary OCR file cleaned up', { publicId: uploadResult.public_id });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary OCR file', cleanupError);
      }

      return ocrResult;

    } catch (error) {
      logger.error('Buffer OCR extraction failed', error);
      
      return {
        success: false,
        text: '',
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Buffer OCR extraction failed'
      };
    }
  }

  /**
   * Check if OCR is available for the given file type
   */
  isOCRSupported(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/tiff',
      'image/bmp',
      'image/webp'
    ];
    
    return supportedTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get estimated processing time based on file size
   */
  getEstimatedProcessingTime(fileSizeBytes: number): number {
    // Rough estimates based on file size
    if (fileSizeBytes < 1024 * 1024) return 5000; // < 1MB: 5 seconds
    if (fileSizeBytes < 5 * 1024 * 1024) return 15000; // < 5MB: 15 seconds  
    if (fileSizeBytes < 10 * 1024 * 1024) return 30000; // < 10MB: 30 seconds
    return 60000; // > 10MB: 60 seconds
  }

  /**
   * Private: Upload file buffer for OCR processing
   */
  private async uploadForOCR(
    fileBuffer: Buffer, 
    options: { fileName?: string; folder?: string }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: options.folder || 'temp-ocr',
          public_id: `ocr-${Date.now()}-${options.fileName || 'document'}`,
          tags: ['temp-ocr', 'auto-delete'],
          ocr: 'adv_ocr', // Apply OCR during upload per Cloudinary docs
          context: {
            purpose: 'ocr-extraction',
            created_at: new Date().toISOString()
          }
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed - no result'));
          }
        }
      );

      stream.end(fileBuffer);
    });
  }

  /**
   * Private: Parse Cloudinary OCR response into standardized format
   */
  private parseOCRResponse(ocrData: any, processingTimeMs: number): OCRResult {
    try {
      // Handle missing OCR data
      if (!ocrData) {
        return {
          success: false,
          text: '',
          processingTimeMs,
          error: 'No OCR data received from Cloudinary'
        };
      }

      let extractedText = '';
      let confidence = 0;
      let metadata = {};

      // Parse Cloudinary OCR response format per documentation
      // Expected structure: { adv_ocr: { status: 'complete', data: [...] } }
      if (ocrData.adv_ocr && ocrData.adv_ocr.status === 'complete') {
        const advOcrData = ocrData.adv_ocr.data;
        
        if (Array.isArray(advOcrData) && advOcrData.length > 0) {
          for (const block of advOcrData) {
            if (block.textAnnotations && Array.isArray(block.textAnnotations)) {
              // First annotation contains all text
              if (block.textAnnotations[0]) {
                extractedText = block.textAnnotations[0].description || '';
                confidence = block.textAnnotations[0].confidence || 85;
                
                metadata = {
                  textBlocks: block.textAnnotations.length - 1,
                  language: block.textAnnotations[0].locale || 'unknown'
                };
                break; // Use first block with text
              }
            }
          }
        }
      }
      
      // Handle incomplete or pending OCR
      else if (ocrData.adv_ocr && ocrData.adv_ocr.status !== 'complete') {
        return {
          success: false,
          text: '',
          processingTimeMs,
          error: `OCR status: ${ocrData.adv_ocr.status || 'unknown'}`
        };
      }

      // Clean up extracted text
      extractedText = this.cleanExtractedText(extractedText);

      return {
        success: extractedText.length > 0,
        text: extractedText,
        confidence,
        processingTimeMs,
        metadata
      };

    } catch (error) {
      logger.error('Failed to parse OCR response', error, { ocrData });
      
      return {
        success: false,
        text: '',
        processingTimeMs,
        error: 'Failed to parse OCR response'
      };
    }
  }

  /**
   * Private: Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Convert remaining \r to \n
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
      .replace(/[ \t]+/g, ' ') // Normalize whitespace
      .trim(); // Remove leading/trailing whitespace
  }
}

// Export singleton instance
export const cloudinaryOCR = new CloudinaryOCRService();