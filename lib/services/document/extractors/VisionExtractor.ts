/**
 * Clean Claude Vision extractor for image-based PDFs and documents
 * Handles OCR with proper error handling, retries, and logging
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  DocumentExtractor,
  DocumentBuffer,
  ExtractionResult,
  ExtractionMethod,
  SupportedFileType,
  ExtractorConfig,
  DocumentMetadata,
  NoTextExtractedError,
  DocumentProcessingError
} from '../types/DocumentTypes';
import { DocumentLogger } from '../utils/DocumentLogger';
import { FileCompressor } from '../utils/FileCompressor';

export interface ClaudeVisionResponse {
  readonly content: ReadonlyArray<{
    readonly type: string;
    readonly text?: string;
  }>;
}

export class VisionExtractor implements DocumentExtractor {
  readonly name = 'VisionExtractor';
  readonly supportedTypes = [
    SupportedFileType.PDF,
    SupportedFileType.JPEG,
    SupportedFileType.PNG
  ] as const;

  private static readonly DEFAULT_CONFIG: Required<ExtractorConfig> = {
    maxTokens: 8192,
    model: 'claude-3-5-sonnet-20241022',
    timeout: 60000, // 60 seconds for vision processing
    retries: 2
  };

  private static readonly MIN_TEXT_LENGTH = 20; // Minimum characters for valid extraction
  private static readonly EXTRACTION_PROMPT = `Please extract ALL text from this inspection report document. Read every page carefully and include:

- All findings and issues mentioned
- All recommendations and notes  
- All cost estimates and pricing
- All table data and measurements
- Headers, footers, and fine print
- Every detail from every page

Be extremely thorough - this is a complete inspection report that should have extensive findings. Extract the complete text content, do not summarize.`;

  private readonly anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new DocumentProcessingError(
        'Anthropic API key not configured',
        'MISSING_API_KEY'
      );
    }

    this.anthropic = new Anthropic({ apiKey });
  }

  canHandle(fileType: SupportedFileType): boolean {
    return fileType === SupportedFileType.PDF || 
           fileType === SupportedFileType.JPEG || 
           fileType === SupportedFileType.PNG;
  }

  async extract(
    document: DocumentBuffer,
    config: ExtractorConfig = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const finalConfig = { ...VisionExtractor.DEFAULT_CONFIG, ...config };

    DocumentLogger.logExtractionAttempt(ExtractionMethod.CLAUDE_VISION);

    try {
      const response = await this.performExtractionWithRetry(document, finalConfig);
      const extractedText = this.extractTextFromResponse(response);
      
      if (!this.isValidTextExtraction(extractedText)) {
        throw new NoTextExtractedError(ExtractionMethod.CLAUDE_VISION);
      }

      const processingTimeMs = Date.now() - startTime;
      const result = this.createSuccessResult(extractedText, document, processingTimeMs, finalConfig);

      DocumentLogger.logExtractionSuccess(
        ExtractionMethod.CLAUDE_VISION,
        result.extractedText.length,
        processingTimeMs
      );

      return result;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      DocumentLogger.logExtractionFailure(ExtractionMethod.CLAUDE_VISION, errorMessage);

      return this.createFailureResult(document, processingTimeMs, errorMessage);
    }
  }

  private async performExtractionWithRetry(
    document: DocumentBuffer,
    config: Required<ExtractorConfig>
  ): Promise<ClaudeVisionResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.retries + 1; attempt++) {
      try {
        DocumentLogger.logDebug(`Vision extraction attempt ${attempt}/${config.retries + 1}`);
        
        return await this.performSingleExtraction(document, config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt <= config.retries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          DocumentLogger.logDebug(`Retrying in ${delayMs}ms after error: ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new DocumentProcessingError('All retry attempts failed', 'RETRY_EXHAUSTED');
  }

  private async performSingleExtraction(
    document: DocumentBuffer,
    config: Required<ExtractorConfig>
  ): Promise<ClaudeVisionResponse> {
    // Check if file needs compression
    const processedDocument = await FileCompressor.compressForVision(document);
    
    // If file is still too large, throw a clear error
    if (FileCompressor.needsCompression(processedDocument.buffer)) {
      throw new DocumentProcessingError(
        `File size ${(processedDocument.buffer.length / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`,
        'FILE_TOO_LARGE'
      );
    }

    const base64Data = processedDocument.buffer.toString('base64');
    const mediaType = this.getMediaType(processedDocument.metadata.fileType);

    const extractionPromise = this.anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: VisionExtractor.EXTRACTION_PROMPT
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            }
          ]
        }
      ]
    });

    // Add timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new DocumentProcessingError(
          `Vision extraction timed out after ${config.timeout}ms`,
          'VISION_TIMEOUT'
        ));
      }, config.timeout);
    });

    return Promise.race([extractionPromise, timeoutPromise]) as Promise<ClaudeVisionResponse>;
  }

  private getMediaType(fileType: SupportedFileType): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    switch (fileType) {
      case SupportedFileType.JPEG:
        return 'image/jpeg';
      case SupportedFileType.PNG:
        return 'image/png';
      default:
        return 'image/jpeg'; // Default fallback for PDF and unknown types
    }
  }

  private extractTextFromResponse(response: ClaudeVisionResponse): string {
    const textContent = response.content.find(item => item.type === 'text');
    return textContent?.text || '';
  }

  private isValidTextExtraction(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmedText = text.trim();
    return trimmedText.length >= VisionExtractor.MIN_TEXT_LENGTH;
  }

  private createSuccessResult(
    extractedText: string,
    document: DocumentBuffer,
    processingTimeMs: number,
    config: Required<ExtractorConfig>
  ): ExtractionResult {
    const metadata: DocumentMetadata = {
      pages: 1, // Vision API typically processes one image at a time
      fileType: document.metadata.fileType,
      extractionMethod: ExtractionMethod.CLAUDE_VISION,
      processingDetails: {
        model: config.model,
        maxTokens: config.maxTokens,
        textStats: {
          totalLength: extractedText.length,
          trimmedLength: extractedText.trim().length,
          lineCount: extractedText.split('\n').length
        }
      }
    };

    return {
      success: true,
      extractedText,
      method: ExtractionMethod.CLAUDE_VISION,
      metadata,
      processingTimeMs
    };
  }

  private createFailureResult(
    document: DocumentBuffer,
    processingTimeMs: number,
    error: string
  ): ExtractionResult {
    const metadata: DocumentMetadata = {
      pages: 0,
      fileType: document.metadata.fileType,
      extractionMethod: ExtractionMethod.CLAUDE_VISION,
      processingDetails: {
        failureReason: error
      }
    };

    return {
      success: false,
      extractedText: '',
      method: ExtractionMethod.CLAUDE_VISION,
      metadata,
      processingTimeMs,
      error
    };
  }

  /**
   * Check if the API key is properly configured
   */
  static isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}