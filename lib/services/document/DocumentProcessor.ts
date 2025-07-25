/**
 * Main DocumentProcessor service - Clean, professional, zero technical debt
 * Orchestrates document processing using strategy pattern with proper fallbacks
 */

import { VisionExtractor, HybridExtractor, GoogleVisionExtractor } from './extractors';
import { FileValidator } from './utils/FileValidator';
import { DocumentLogger } from './utils/DocumentLogger';
import {
  DocumentExtractor,
  DocumentBuffer,
  ExtractionResult,
  ExtractionMethod,
  SupportedFileType,
  ProcessorOptions,
  ProcessingContext,
  FileMetadata,
  UnsupportedFileTypeError,
  DocumentProcessingError,
  NoTextExtractedError
} from './types/DocumentTypes';

export class DocumentProcessor {
  private readonly extractors: Map<ExtractionMethod, DocumentExtractor>;
  private readonly defaultOptions: Required<ProcessorOptions>;

  constructor() {
    this.extractors = new Map<ExtractionMethod, DocumentExtractor>();
    this.extractors.set(ExtractionMethod.CLAUDE_VISION, new VisionExtractor());
    this.extractors.set(ExtractionMethod.GOOGLE_VISION, new GoogleVisionExtractor());
    this.extractors.set(ExtractionMethod.HYBRID, new HybridExtractor());

    this.defaultOptions = {
      preferredMethod: ExtractionMethod.HYBRID, // Use hybrid as default for better results
      fallbackEnabled: true,
      timeout: 180000, // 3 minutes total (hybrid takes longer)
      extractorConfig: {
        maxTokens: 8192,
        timeout: 90000, // Increased for hybrid processing
        retries: 1
      }
    };
  }

  /**
   * Main entry point for document processing
   */
  async processDocument(
    file: File,
    options: ProcessorOptions = {},
    context?: ProcessingContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const finalOptions = { ...this.defaultOptions, ...options };
    const processingContext = { startTime, ...context };

    try {
      // Convert File to DocumentBuffer
      const documentBuffer = await this.createDocumentBuffer(file);
      
      // Validate file
      this.validateDocument(documentBuffer, processingContext);
      
      // Process with preferred method first, then fallback if needed
      const result = await this.executeExtractionStrategy(
        documentBuffer,
        finalOptions,
        processingContext
      );

      const totalTimeMs = Date.now() - startTime;
      DocumentLogger.logProcessingComplete(
        result.success,
        totalTimeMs,
        result.method,
        processingContext
      );

      return result;

    } catch (error) {
      const totalTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';

      DocumentLogger.logError(
        error instanceof Error ? error : new Error(errorMessage),
        processingContext
      );

      return this.createFailureResult(file.name, totalTimeMs, errorMessage);
    }
  }

  /**
   * Process a Buffer directly (for cases where you already have the buffer)
   */
  async processBuffer(
    buffer: Buffer,
    fileName: string,
    options: ProcessorOptions = {},
    context?: ProcessingContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const processingContext = { startTime, ...context };

    try {
      const fileType = FileValidator.detectFileType(buffer);
      const metadata: FileMetadata = {
        fileName,
        fileSize: buffer.length,
        fileType,
        lastModified: Date.now()
      };

      const documentBuffer: DocumentBuffer = { buffer, metadata };
      
      this.validateDocument(documentBuffer, processingContext);
      
      const finalOptions = { ...this.defaultOptions, ...options };
      const result = await this.executeExtractionStrategy(
        documentBuffer,
        finalOptions,
        processingContext
      );

      const totalTimeMs = Date.now() - startTime;
      DocumentLogger.logProcessingComplete(
        result.success,
        totalTimeMs,
        result.method,
        processingContext
      );

      return result;

    } catch (error) {
      const totalTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';

      DocumentLogger.logError(
        error instanceof Error ? error : new Error(errorMessage),
        processingContext
      );

      return this.createFailureResult(fileName, totalTimeMs, errorMessage);
    }
  }

  private async createDocumentBuffer(file: File): Promise<DocumentBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileType = FileValidator.detectFileType(buffer);

    const metadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType,
      lastModified: file.lastModified
    };

    return { buffer, metadata };
  }

  private validateDocument(
    document: DocumentBuffer,
    context?: ProcessingContext
  ): void {
    const validation = FileValidator.validateFile(
      document.buffer,
      document.metadata.fileName,
      document.metadata.fileSize
    );

    DocumentLogger.logValidation(
      document.metadata.fileName,
      document.metadata.fileType,
      validation.isValid,
      validation.validationErrors,
      context
    );

    if (!validation.isValid) {
      throw new UnsupportedFileTypeError(
        `File validation failed: ${validation.validationErrors.join(', ')}`
      );
    }

    DocumentLogger.logProcessingStart(
      document.metadata.fileName,
      document.metadata.fileSize,
      document.metadata.fileType,
      context
    );
  }

  private async executeExtractionStrategy(
    document: DocumentBuffer,
    options: Required<ProcessorOptions>,
    context?: ProcessingContext
  ): Promise<ExtractionResult> {
    const strategy = this.determineExtractionStrategy(document, options);
    
    // Try primary extraction method
    const primaryResult = await this.attemptExtraction(
      document,
      strategy.primary,
      options,
      context
    );

    if (primaryResult.success) {
      return primaryResult;
    }

    // Try fallback if enabled and available
    if (options.fallbackEnabled && strategy.fallback) {
      DocumentLogger.logFallbackAttempt(
        strategy.primary,
        strategy.fallback,
        context
      );

      const fallbackResult = await this.attemptExtraction(
        document,
        strategy.fallback,
        options,
        context
      );

      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    // Both methods failed
    throw new NoTextExtractedError(strategy.primary);
  }

  private determineExtractionStrategy(
    document: DocumentBuffer,
    options: Required<ProcessorOptions>
  ): { primary: ExtractionMethod; fallback?: ExtractionMethod } {
    const fileType = document.metadata.fileType;

    // For PDFs and images, use hybrid extraction (OCR + Vision)
    if (fileType === SupportedFileType.PDF || FileValidator.isImageFile(document.buffer)) {
      return {
        primary: ExtractionMethod.HYBRID,
        fallback: ExtractionMethod.CLAUDE_VISION
      };
    }

    // Use preferred method from options (fallback to vision)
    return {
      primary: options.preferredMethod === ExtractionMethod.HYBRID ? ExtractionMethod.HYBRID : ExtractionMethod.CLAUDE_VISION,
      fallback: ExtractionMethod.CLAUDE_VISION
    };
  }

  private async attemptExtraction(
    document: DocumentBuffer,
    method: ExtractionMethod,
    options: Required<ProcessorOptions>,
    context?: ProcessingContext
  ): Promise<ExtractionResult> {
    const extractor = this.extractors.get(method);
    
    if (!extractor) {
      throw new DocumentProcessingError(
        `No extractor available for method: ${method}`,
        'EXTRACTOR_NOT_FOUND'
      );
    }

    if (!extractor.canHandle(document.metadata.fileType)) {
      throw new DocumentProcessingError(
        `Extractor ${extractor.name} cannot handle file type: ${document.metadata.fileType}`,
        'UNSUPPORTED_FILE_TYPE_FOR_EXTRACTOR'
      );
    }

    return extractor.extract(document, options.extractorConfig);
  }

  private createFailureResult(
    fileName: string,
    processingTimeMs: number,
    error: string
  ): ExtractionResult {
    return {
      success: false,
      extractedText: '',
      method: ExtractionMethod.FALLBACK,
      metadata: {
        pages: 0,
        fileType: SupportedFileType.UNKNOWN,
        extractionMethod: ExtractionMethod.FALLBACK,
        processingDetails: {
          failureReason: error,
          fileName
        }
      },
      processingTimeMs,
      error
    };
  }

  /**
   * Check if the processor is properly configured
   */
  static isConfigured(): boolean {
    return VisionExtractor.isConfigured();
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): readonly SupportedFileType[] {
    return [
      SupportedFileType.PDF,
      SupportedFileType.JPEG,
      SupportedFileType.PNG
    ];
  }

  /**
   * Estimate processing time based on file size and type
   */
  estimateProcessingTime(fileSize: number, fileType: SupportedFileType): number {
    const baseTime = 5000; // 5 seconds base
    const sizeMultiplier = Math.max(1, fileSize / (1024 * 1024)); // Per MB
    const typeMultiplier = fileType === SupportedFileType.PDF ? 1.5 : 2; // Vision takes longer

    return Math.round(baseTime * sizeMultiplier * typeMultiplier);
  }
}