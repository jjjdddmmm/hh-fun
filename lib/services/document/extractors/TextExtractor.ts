/**
 * Clean PDF text extractor using pdf-parse
 * Handles text-based PDFs with proper error handling and logging
 */

import pdfParse from 'pdf-parse';
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

export interface PdfParseResult {
  readonly text: string;
  readonly numpages: number;
  readonly info?: Record<string, unknown>;
}

export class TextExtractor implements DocumentExtractor {
  readonly name = 'TextExtractor';
  readonly supportedTypes = [SupportedFileType.PDF] as const;

  private static readonly DEFAULT_CONFIG: Required<ExtractorConfig> = {
    maxTokens: 8192,
    model: 'pdf-parse',
    timeout: 30000, // 30 seconds
    retries: 2
  };

  private static readonly MIN_TEXT_LENGTH = 50; // Minimum characters for valid extraction

  canHandle(fileType: SupportedFileType): boolean {
    return fileType === SupportedFileType.PDF;
  }

  async extract(
    document: DocumentBuffer,
    config: ExtractorConfig = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const finalConfig = { ...TextExtractor.DEFAULT_CONFIG, ...config };

    DocumentLogger.logExtractionAttempt(ExtractionMethod.PDF_PARSE);

    try {
      const pdfData = await this.performExtraction(document.buffer, finalConfig);
      
      if (!this.isValidTextExtraction(pdfData.text)) {
        throw new NoTextExtractedError(ExtractionMethod.PDF_PARSE);
      }

      const processingTimeMs = Date.now() - startTime;
      const result = this.createSuccessResult(pdfData, document, processingTimeMs);

      DocumentLogger.logExtractionSuccess(
        ExtractionMethod.PDF_PARSE,
        result.extractedText.length,
        processingTimeMs
      );

      return result;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      DocumentLogger.logExtractionFailure(ExtractionMethod.PDF_PARSE, errorMessage);

      return this.createFailureResult(document, processingTimeMs, errorMessage);
    }
  }

  private async performExtraction(
    buffer: Buffer,
    config: Required<ExtractorConfig>
  ): Promise<PdfParseResult> {
    // Add timeout protection
    const extractionPromise = pdfParse(buffer, {
      max: 0, // Parse all pages
      version: 'v1.10.100' // Use stable version
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new DocumentProcessingError(
          `PDF parsing timed out after ${config.timeout}ms`,
          'PARSING_TIMEOUT'
        ));
      }, config.timeout);
    });

    return Promise.race([extractionPromise, timeoutPromise]);
  }

  private isValidTextExtraction(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmedText = text.trim();
    
    // Check minimum length
    if (trimmedText.length < TextExtractor.MIN_TEXT_LENGTH) {
      return false;
    }

    // Check if text contains meaningful content (not just whitespace/special chars)
    const meaningfulChars = trimmedText.replace(/[\s\n\r\t]/g, '').length;
    return meaningfulChars >= TextExtractor.MIN_TEXT_LENGTH * 0.5;
  }

  private createSuccessResult(
    pdfData: PdfParseResult,
    document: DocumentBuffer,
    processingTimeMs: number
  ): ExtractionResult {
    const metadata: DocumentMetadata = {
      pages: pdfData.numpages,
      fileType: document.metadata.fileType,
      extractionMethod: ExtractionMethod.PDF_PARSE,
      processingDetails: {
        pdfInfo: pdfData.info,
        textStats: {
          totalLength: pdfData.text.length,
          trimmedLength: pdfData.text.trim().length,
          lineCount: pdfData.text.split('\n').length
        }
      }
    };

    return {
      success: true,
      extractedText: pdfData.text,
      method: ExtractionMethod.PDF_PARSE,
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
      extractionMethod: ExtractionMethod.PDF_PARSE,
      processingDetails: {
        failureReason: error
      }
    };

    return {
      success: false,
      extractedText: '',
      method: ExtractionMethod.PDF_PARSE,
      metadata,
      processingTimeMs,
      error
    };
  }

  /**
   * Static method to quickly check if a PDF likely contains extractable text
   */
  static async canExtractText(buffer: Buffer): Promise<boolean> {
    try {
      const data = await pdfParse(buffer, { max: 1 }); // Check only first page
      return data.text.trim().length > TextExtractor.MIN_TEXT_LENGTH;
    } catch {
      return false;
    }
  }
}