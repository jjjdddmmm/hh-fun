/**
 * Main export file for the document processing service
 * Clean, organized exports with zero technical debt
 */

// Main service
export { DocumentProcessor } from './DocumentProcessor';

// Extractors
export { VisionExtractor, HybridExtractor } from './extractors';

// Utilities
export { FileValidator } from './utils/FileValidator';
export { DocumentLogger } from './utils/DocumentLogger';

// Types and interfaces
export type {
  DocumentExtractor,
  DocumentBuffer,
  ExtractionResult,
  DocumentMetadata,
  FileMetadata,
  ExtractorConfig,
  ProcessorOptions,
  ProcessingContext
} from './types/DocumentTypes';

export {
  SupportedFileType,
  ExtractionMethod,
  DocumentProcessingError,
  UnsupportedFileTypeError,
  ExtractionTimeoutError,
  NoTextExtractedError
} from './types/DocumentTypes';