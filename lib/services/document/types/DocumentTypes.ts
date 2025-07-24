/**
 * Clean TypeScript interfaces for document processing
 * Zero technical debt, properly typed, extensible
 */

export enum SupportedFileType {
  PDF = 'application/pdf',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  UNKNOWN = 'unknown'
}

export enum ExtractionMethod {
  PDF_PARSE = 'pdf-parse',
  CLAUDE_VISION = 'claude-vision',
  FALLBACK = 'fallback'
}

export interface FileMetadata {
  readonly fileName: string;
  readonly fileSize: number;
  readonly fileType: SupportedFileType;
  readonly lastModified?: number;
}

export interface DocumentBuffer {
  readonly buffer: Buffer;
  readonly metadata: FileMetadata;
}

export interface ExtractionResult {
  readonly success: boolean;
  readonly extractedText: string;
  readonly method: ExtractionMethod;
  readonly metadata: DocumentMetadata;
  readonly processingTimeMs: number;
  readonly error?: string;
}

export interface DocumentMetadata {
  readonly pages: number;
  readonly confidence?: number;
  readonly fileType: SupportedFileType;
  readonly extractionMethod: ExtractionMethod;
  readonly processingDetails?: Record<string, unknown>;
}

export interface ExtractorConfig {
  readonly maxTokens?: number;
  readonly model?: string;
  readonly timeout?: number;
  readonly retries?: number;
}

export interface DocumentExtractor {
  readonly name: string;
  readonly supportedTypes: readonly SupportedFileType[];
  
  canHandle(fileType: SupportedFileType): boolean;
  extract(document: DocumentBuffer, config?: ExtractorConfig): Promise<ExtractionResult>;
}

export interface ProcessorOptions {
  readonly preferredMethod?: ExtractionMethod;
  readonly fallbackEnabled?: boolean;
  readonly timeout?: number;
  readonly extractorConfig?: ExtractorConfig;
}

export interface ProcessingContext {
  readonly startTime: number;
  readonly requestId?: string;
  readonly reportType?: string;
}

// Error types for better error handling
export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export class UnsupportedFileTypeError extends DocumentProcessingError {
  constructor(fileType: string) {
    super(
      `Unsupported file type: ${fileType}`,
      'UNSUPPORTED_FILE_TYPE',
      { fileType }
    );
  }
}

export class ExtractionTimeoutError extends DocumentProcessingError {
  constructor(timeoutMs: number) {
    super(
      `Document extraction timed out after ${timeoutMs}ms`,
      'EXTRACTION_TIMEOUT',
      { timeoutMs }
    );
  }
}

export class NoTextExtractedError extends DocumentProcessingError {
  constructor(method: ExtractionMethod) {
    super(
      `No text could be extracted using method: ${method}`,
      'NO_TEXT_EXTRACTED',
      { method }
    );
  }
}