/**
 * LlamaParse Document Processor
 * Simple, reliable document extraction using LlamaParse
 */

import { logger } from "@/lib/utils/logger";
import { FileCache } from "../cache/FileCache";

export interface LlamaParseResult {
  success: boolean;
  extractedText: string;
  processingTime: number;
  error?: string;
}

export class LlamaParseProcessor {
  private static readonly LLAMAPARSE_API_URL = 'https://api.cloud.llamaindex.ai/api/parsing/upload';
  private static readonly TIMEOUT = 120000; // 2 minutes

  /**
   * Process document using LlamaParse with caching
   */
  static async processDocument(
    fileBuffer: Buffer,
    fileName: string,
    reportType: string
  ): Promise<LlamaParseResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cachedResult = await FileCache.get(fileBuffer, fileName);
      if (cachedResult) {
        logger.info('Using cached LlamaParse result', {
          fileName,
          reportType,
          processingTime: Date.now() - startTime
        });
        
        return {
          success: true,
          extractedText: cachedResult.extractedText,
          processingTime: Date.now() - startTime
        };
      }

      const apiKey = process.env.LLAMAPARSE_API_KEY;
      if (!apiKey) {
        throw new Error('LLAMAPARSE_API_KEY not found in environment variables');
      }

      logger.info('Starting LlamaParse processing (cache miss)', {
        fileName,
        reportType,
        fileSize: fileBuffer.length
      });

      // Create form data for LlamaParse
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, fileName);
      formData.append('parsing_instruction', this.createParsingInstruction(reportType));
      formData.append('result_type', 'markdown');
      formData.append('target_pages', ''); // Process all pages
      formData.append('language', 'en');
      formData.append('verbose', 'true');

      // Upload to LlamaParse
      const response = await fetch(this.LLAMAPARSE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LlamaParse API error (${response.status}): ${errorText}`);
      }

      const uploadResult = await response.json();
      
      if (!uploadResult.id) {
        throw new Error('No job ID returned from LlamaParse');
      }

      // Poll for completion
      const extractedText = await this.pollForCompletion(uploadResult.id, apiKey);

      const processingTime = Date.now() - startTime;

      logger.info('LlamaParse processing completed', {
        fileName,
        processingTime,
        textLength: extractedText.length
      });

      const result = {
        success: true,
        extractedText,
        processingTime
      };

      // Cache the result for future use (24 hour TTL)
      await FileCache.set(fileBuffer, fileName, {
        extractedText,
        processingTime,
        timestamp: Date.now()
      }, 24 * 60 * 60 * 1000); // 24 hours

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('LlamaParse processing failed', error, {
        fileName,
        reportType,
        processingTime
      });

      return {
        success: false,
        extractedText: '',
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Poll LlamaParse job until completion
   */
  private static async pollForCompletion(jobId: string, apiKey: string): Promise<string> {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          }
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'SUCCESS') {
          // Get the result
          const resultResponse = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            }
          });

          if (!resultResponse.ok) {
            throw new Error(`Result fetch failed: ${resultResponse.status}`);
          }

          const text = await resultResponse.text();
          return text;
        }

        if (result.status === 'ERROR') {
          throw new Error(`LlamaParse job failed: ${result.error || 'Unknown error'}`);
        }

        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        logger.warn('Polling attempt failed', { attempt, jobId, error });
        
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('LlamaParse job timed out');
  }

  /**
   * Create parsing instruction based on document type
   */
  private static createParsingInstruction(reportType: string): string {
    const baseInstruction = `
Extract all text from this ${reportType} inspection report document. Pay special attention to:

1. **Issues and Problems**: Any defects, deficiencies, or items requiring attention
2. **Recommendations**: Repair recommendations and maintenance suggestions  
3. **Safety Concerns**: Any safety-related issues or hazards
4. **Cost Estimates**: Any mentioned repair costs or estimates
5. **Tables and Lists**: Preserve formatting of structured data
6. **Section Headers**: Maintain document structure and organization

Preserve the original structure and formatting. Include all technical details, measurements, and specific recommendations.
    `.trim();

    switch (reportType.toLowerCase()) {
      case 'home':
        return baseInstruction + '\n\nFocus on home inspection items including structural, electrical, plumbing, HVAC, and general maintenance issues.';
      
      case 'termite':
        return baseInstruction + '\n\nFocus on pest control findings, termite damage, treatment recommendations, and preventive measures.';
      
      case 'septic':
        return baseInstruction + '\n\nFocus on septic system condition, pumping recommendations, and any required repairs or maintenance.';
      
      default:
        return baseInstruction;
    }
  }
}