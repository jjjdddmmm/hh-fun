/**
 * Google Vision API extractor for PDFs and documents
 * Clean implementation following architecture patterns
 * Handles OCR with proper error handling, retries, and logging
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
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

export class GoogleVisionExtractor implements DocumentExtractor {
  readonly name = 'GoogleVisionExtractor';
  readonly supportedTypes = [
    SupportedFileType.PDF,
    SupportedFileType.JPEG,
    SupportedFileType.PNG
  ] as const;

  private static readonly DEFAULT_CONFIG: Required<ExtractorConfig> = {
    maxTokens: 8192, // Not used for Google Vision but required by interface
    model: 'google-document-ai', // Model identifier
    timeout: 30000, // 30 seconds for document processing
    retries: 2
  };

  private static readonly MIN_TEXT_LENGTH = 20;
  private static readonly PAGE_LIMIT = 30; // Google Vision API limit

  private readonly client: DocumentProcessorServiceClient;
  private readonly projectId: string;
  private readonly location = 'us';
  private readonly processorId: string;

  constructor() {
    // Parse credentials from environment variable
    const serviceAccountJson = process.env.GOOGLE_DOC_AI;
    if (!serviceAccountJson) {
      throw new DocumentProcessingError(
        'Google Document AI credentials not configured',
        'MISSING_CREDENTIALS'
      );
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (error) {
      throw new DocumentProcessingError(
        'Invalid Google Document AI credentials format',
        'INVALID_CREDENTIALS'
      );
    }

    this.processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;
    if (!this.processorId) {
      throw new DocumentProcessingError(
        'Google Document AI processor ID not configured',
        'MISSING_PROCESSOR_ID'
      );
    }

    this.projectId = credentials.project_id;
    this.client = new DocumentProcessorServiceClient({
      credentials,
      projectId: this.projectId
    });
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
    const finalConfig = { ...GoogleVisionExtractor.DEFAULT_CONFIG, ...config };

    DocumentLogger.logExtractionAttempt(ExtractionMethod.GOOGLE_VISION);

    try {
      const response = await this.performExtractionWithRetry(document, finalConfig);
      const extractedText = response.document?.text || '';
      
      if (!this.isValidTextExtraction(extractedText)) {
        throw new NoTextExtractedError(ExtractionMethod.GOOGLE_VISION);
      }

      const processingTimeMs = Date.now() - startTime;
      const result = this.createSuccessResult(extractedText, document, processingTimeMs, finalConfig, response);

      DocumentLogger.logExtractionSuccess(
        ExtractionMethod.GOOGLE_VISION,
        result.extractedText.length,
        processingTimeMs
      );

      return result;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      DocumentLogger.logExtractionFailure(ExtractionMethod.GOOGLE_VISION, errorMessage);

      return this.createFailureResult(document, processingTimeMs, errorMessage);
    }
  }

  private async performExtractionWithRetry(
    document: DocumentBuffer,
    config: Required<ExtractorConfig>
  ): Promise<any> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.retries + 1; attempt++) {
      try {
        DocumentLogger.logDebug(`Google Vision extraction attempt ${attempt}/${config.retries + 1}`);
        
        return await this.performSingleExtraction(document, config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }
        
        if (attempt <= config.retries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
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
  ): Promise<any> {
    const request = {
      name: `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`,
      rawDocument: {
        content: document.buffer,
        mimeType: this.getMimeType(document.metadata.fileType),
      },
    };

    // Add timeout protection
    const extractionPromise = this.client.processDocument(request);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new DocumentProcessingError(
          `Google Vision extraction timed out after ${config.timeout}ms`,
          'VISION_TIMEOUT'
        ));
      }, config.timeout);
    });

    const [result] = await Promise.race([extractionPromise, timeoutPromise]) as any;
    return result;
  }

  private getMimeType(fileType: SupportedFileType): string {
    switch (fileType) {
      case SupportedFileType.PDF:
        return 'application/pdf';
      case SupportedFileType.JPEG:
        return 'image/jpeg';
      case SupportedFileType.PNG:
        return 'image/png';
      default:
        return 'application/pdf';
    }
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('pages exceed the limit') || 
           message.includes('invalid_argument') ||
           message.includes('permission_denied') ||
           message.includes('not_found');
  }

  private isValidTextExtraction(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmedText = text.trim();
    return trimmedText.length >= GoogleVisionExtractor.MIN_TEXT_LENGTH;
  }

  private createSuccessResult(
    extractedText: string,
    document: DocumentBuffer,
    processingTimeMs: number,
    config: Required<ExtractorConfig>,
    response: any
  ): ExtractionResult {
    const pageCount = response.document?.pages?.length || 1;
    const cost = (pageCount / 1000) * 1.50; // $1.50 per 1000 pages

    const metadata: DocumentMetadata = {
      pages: pageCount,
      fileType: document.metadata.fileType,
      extractionMethod: ExtractionMethod.GOOGLE_VISION,
      processingDetails: {
        model: 'google-document-ai',
        cost: `$${cost.toFixed(4)}`,
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
      method: ExtractionMethod.GOOGLE_VISION,
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
      extractionMethod: ExtractionMethod.GOOGLE_VISION,
      processingDetails: {
        failureReason: error
      }
    };

    return {
      success: false,
      extractedText: '',
      method: ExtractionMethod.GOOGLE_VISION,
      metadata,
      processingTimeMs,
      error
    };
  }

  /**
   * Check if the API credentials are properly configured
   */
  static isConfigured(): boolean {
    return !!(process.env.GOOGLE_DOC_AI && process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID);
  }

  /**
   * Estimate if document can be processed (under page limit)
   */
  static canProcessDocument(estimatedPages: number): boolean {
    return estimatedPages <= GoogleVisionExtractor.PAGE_LIMIT;
  }
}