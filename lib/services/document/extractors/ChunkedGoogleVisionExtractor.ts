/**
 * Chunked Google Vision API extractor for large PDFs
 * Handles documents over 30 pages by splitting into chunks
 * Clean implementation following architecture patterns
 */

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
import { DocumentChunker, DocumentChunk } from '../utils/DocumentChunker';
import { GoogleVisionExtractor } from './GoogleVisionExtractor';

export class ChunkedGoogleVisionExtractor implements DocumentExtractor {
  readonly name = 'ChunkedGoogleVisionExtractor';
  readonly supportedTypes = [
    SupportedFileType.PDF,
    SupportedFileType.JPEG,
    SupportedFileType.PNG
  ] as const;

  private static readonly DEFAULT_CONFIG: Required<ExtractorConfig> = {
    maxTokens: 8192,
    model: 'google-document-ai-chunked',
    timeout: 60000, // Extended timeout for multiple chunks
    retries: 1 // Reduced retries since we have multiple chunks
  };

  private static readonly MIN_TEXT_LENGTH = 50;

  private readonly googleVisionExtractor: GoogleVisionExtractor;

  constructor() {
    this.googleVisionExtractor = new GoogleVisionExtractor();
  }

  canHandle(fileType: SupportedFileType): boolean {
    return this.googleVisionExtractor.canHandle(fileType);
  }

  async extract(
    document: DocumentBuffer,
    config: ExtractorConfig = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const finalConfig = { ...ChunkedGoogleVisionExtractor.DEFAULT_CONFIG, ...config };

    DocumentLogger.logExtractionAttempt(ExtractionMethod.GOOGLE_VISION);

    try {
      // Step 1: Chunk the document if needed
      const chunkingResult = await DocumentChunker.chunkDocument(document);
      
      if (!chunkingResult.success) {
        throw new DocumentProcessingError(
          `Document chunking failed: ${chunkingResult.error}`,
          'CHUNKING_FAILED'
        );
      }

      DocumentLogger.logStep(
        'Chunked Processing',
        `Processing ${chunkingResult.chunks.length} chunks (${chunkingResult.originalPageCount} total pages)`,
        undefined,
        {
          fileName: document.metadata.fileName,
          totalPages: chunkingResult.originalPageCount,
          chunkCount: chunkingResult.chunks.length
        }
      );

      // Step 2: Process each chunk with Google Vision
      const chunkResults = await this.processChunks(chunkingResult.chunks, finalConfig);

      // Step 3: Combine results
      const combinedResult = DocumentChunker.combineChunkResults(chunkResults);
      
      if (combinedResult.successfulChunks === 0) {
        throw new NoTextExtractedError(ExtractionMethod.GOOGLE_VISION);
      }

      const extractedText = combinedResult.combinedText;
      
      if (!this.isValidTextExtraction(extractedText)) {
        throw new NoTextExtractedError(ExtractionMethod.GOOGLE_VISION);
      }

      const processingTimeMs = Date.now() - startTime;
      const result = this.createSuccessResult(
        extractedText, 
        document, 
        processingTimeMs, 
        finalConfig,
        chunkingResult,
        combinedResult
      );

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

  /**
   * Process multiple chunks in parallel with rate limiting
   */
  private async processChunks(
    chunks: DocumentChunk[],
    config: Required<ExtractorConfig>
  ): Promise<Array<{
    text: string;
    chunkIndex: number;
    startPage: number;
    endPage: number;
    success: boolean;
    error?: string;
    processingTimeMs: number;
  }>> {
    const results = [];

    // Process chunks sequentially to avoid rate limits
    // In production, you might implement parallel processing with rate limiting
    for (const chunk of chunks) {
      const chunkStartTime = Date.now();
      
      try {
        DocumentLogger.logStep(
          'Chunk Processing',
          `Processing chunk ${chunk.chunkIndex + 1}/${chunk.metadata.totalChunks} (pages ${chunk.startPage}-${chunk.endPage})`,
          undefined,
          {
            chunkIndex: chunk.chunkIndex,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            fileName: chunk.metadata.originalFileName
          }
        );

        // Create a DocumentBuffer for this chunk
        const chunkDocument: DocumentBuffer = {
          buffer: chunk.buffer,
          metadata: {
            fileName: `${chunk.metadata.originalFileName}_chunk_${chunk.chunkIndex + 1}`,
            fileSize: chunk.buffer.length,
            fileType: chunk.metadata.fileType,
            lastModified: Date.now()
          }
        };

        // Extract text from this chunk
        const chunkResult = await this.googleVisionExtractor.extract(chunkDocument, config);
        const processingTimeMs = Date.now() - chunkStartTime;

        if (chunkResult.success) {
          DocumentLogger.logStep(
            'Chunk Processing',
            `Chunk ${chunk.chunkIndex + 1} completed successfully`,
            undefined,
            {
              chunkIndex: chunk.chunkIndex,
              textLength: chunkResult.extractedText.length,
              processingTimeMs
            }
          );

          results.push({
            text: chunkResult.extractedText,
            chunkIndex: chunk.chunkIndex,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            success: true,
            processingTimeMs
          });
        } else {
          DocumentLogger.logStep(
            'Chunk Processing',
            `Chunk ${chunk.chunkIndex + 1} failed`,
            undefined,
            {
              chunkIndex: chunk.chunkIndex,
              error: chunkResult.error,
              processingTimeMs
            }
          );

          results.push({
            text: '',
            chunkIndex: chunk.chunkIndex,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            success: false,
            error: chunkResult.error,
            processingTimeMs
          });
        }

        // Add a small delay between chunks to be respectful to the API
        if (chunk.chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }

      } catch (error) {
        const processingTimeMs = Date.now() - chunkStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Chunk processing failed';

        DocumentLogger.logStep(
          'Chunk Processing',
          `Chunk ${chunk.chunkIndex + 1} failed with error`,
          undefined,
          {
            chunkIndex: chunk.chunkIndex,
            error: errorMessage,
            processingTimeMs
          }
        );

        results.push({
          text: '',
          chunkIndex: chunk.chunkIndex,
          startPage: chunk.startPage,
          endPage: chunk.endPage,
          success: false,
          error: errorMessage,
          processingTimeMs
        });
      }
    }

    return results;
  }

  private isValidTextExtraction(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmedText = text.trim();
    return trimmedText.length >= ChunkedGoogleVisionExtractor.MIN_TEXT_LENGTH;
  }

  private createSuccessResult(
    extractedText: string,
    document: DocumentBuffer,
    processingTimeMs: number,
    config: Required<ExtractorConfig>,
    chunkingResult: any,
    combinedResult: any
  ): ExtractionResult {
    const totalCost = (chunkingResult.originalPageCount / 1000) * 1.50; // $1.50 per 1000 pages

    const metadata: DocumentMetadata = {
      pages: chunkingResult.originalPageCount,
      fileType: document.metadata.fileType,
      extractionMethod: ExtractionMethod.GOOGLE_VISION,
      processingDetails: {
        model: 'google-document-ai-chunked',
        cost: `$${totalCost.toFixed(4)}`,
        chunking: {
          totalChunks: combinedResult.totalChunks,
          successfulChunks: combinedResult.successfulChunks,
          failedChunks: combinedResult.failedChunks,
          originalPageCount: chunkingResult.originalPageCount
        },
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
        failureReason: error,
        chunking: {
          attempted: true,
          failed: true
        }
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
    return GoogleVisionExtractor.isConfigured();
  }
}