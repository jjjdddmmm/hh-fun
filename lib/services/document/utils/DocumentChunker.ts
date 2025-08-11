/**
 * Document Chunking Service
 * Splits large PDFs into processable chunks for Google Vision API
 * Clean implementation with proper error handling and logging
 */

import { DocumentBuffer, SupportedFileType, DocumentProcessingError } from '../types/DocumentTypes';
import { DocumentLogger } from './DocumentLogger';
import { PDFPageCounter } from './PDFPageCounter';
import { PDFDocument } from 'pdf-lib';

export interface DocumentChunk {
  readonly buffer: Buffer;
  readonly chunkIndex: number;
  readonly startPage: number;
  readonly endPage: number;
  readonly pageCount: number;
  readonly metadata: {
    readonly originalFileName: string;
    readonly originalPageCount: number;
    readonly totalChunks: number;
    readonly fileType: SupportedFileType;
  };
}

export interface ChunkingResult {
  readonly success: boolean;
  readonly chunks: DocumentChunk[];
  readonly originalPageCount: number;
  readonly processingTimeMs: number;
  readonly error?: string;
}

export class DocumentChunker {
  // Note: CHUNK_SIZE reserved for future use - Google Vision pagination
  // private static readonly CHUNK_SIZE = 15;

  /**
   * Split a document into chunks if needed
   */
  static async chunkDocument(document: DocumentBuffer): Promise<ChunkingResult> {
    const startTime = Date.now();
    const fileName = document.metadata.fileName;

    try {
      DocumentLogger.logStep(
        'Document Chunking',
        'Starting document chunking analysis',
        undefined,
        { fileName, fileSize: document.metadata.fileSize }
      );

      // Only PDF files need chunking for now
      if (document.metadata.fileType !== SupportedFileType.PDF) {
        return this.createSingleChunkResult(document, Date.now() - startTime);
      }

      // Count pages in the PDF
      const pageCountResult = await PDFPageCounter.countPages(document.buffer, fileName);
      
      if (!pageCountResult.success) {
        throw new DocumentProcessingError(
          `Page counting failed: ${pageCountResult.error}`,
          'PAGE_COUNT_FAILED'
        );
      }

      const pageCount = pageCountResult.pageCount;
      const chunkConfig = PDFPageCounter.calculateChunks(pageCount);

      DocumentLogger.logStep(
        'Document Chunking',
        `Document has ${pageCount} pages, ${chunkConfig.needsChunking ? 'chunking required' : 'no chunking needed'}`,
        undefined,
        { 
          fileName, 
          pageCount, 
          needsChunking: chunkConfig.needsChunking,
          chunkCount: chunkConfig.chunkCount 
        }
      );

      if (!chunkConfig.needsChunking) {
        return this.createSingleChunkResult(document, Date.now() - startTime, pageCount);
      }

      // Create chunks for large document
      const chunks = await this.createPDFChunks(document, chunkConfig.chunks);
      const processingTimeMs = Date.now() - startTime;

      DocumentLogger.logStep(
        'Document Chunking',
        `Successfully created ${chunks.length} chunks`,
        undefined,
        { fileName, originalPages: pageCount, chunkCount: chunks.length, processingTimeMs }
      );

      return {
        success: true,
        chunks,
        originalPageCount: pageCount,
        processingTimeMs
      };

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Chunking failed';

      DocumentLogger.logStep(
        'Document Chunking',
        `Chunking failed: ${errorMessage}`,
        undefined,
        { fileName, processingTimeMs, error: errorMessage }
      );

      return {
        success: false,
        chunks: [],
        originalPageCount: 0,
        processingTimeMs,
        error: errorMessage
      };
    }
  }

  /**
   * Create a single chunk result for documents that don't need chunking
   */
  private static createSingleChunkResult(
    document: DocumentBuffer, 
    processingTimeMs: number,
    pageCount: number = 1
  ): ChunkingResult {
    const chunk: DocumentChunk = {
      buffer: document.buffer,
      chunkIndex: 0,
      startPage: 1,
      endPage: pageCount,
      pageCount,
      metadata: {
        originalFileName: document.metadata.fileName,
        originalPageCount: pageCount,
        totalChunks: 1,
        fileType: document.metadata.fileType
      }
    };

    return {
      success: true,
      chunks: [chunk],
      originalPageCount: pageCount,
      processingTimeMs
    };
  }

  /**
   * Create PDF chunks using page range extraction
   */
  private static async createPDFChunks(
    document: DocumentBuffer,
    chunkConfig: Array<{ startPage: number; endPage: number; pageCount: number }>
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const originalPageCount = chunkConfig.reduce((sum, chunk) => sum + chunk.pageCount, 0);

    for (let i = 0; i < chunkConfig.length; i++) {
      const config = chunkConfig[i];
      
      try {
        DocumentLogger.logStep(
          'PDF Chunking',
          `Creating chunk ${i + 1}/${chunkConfig.length} (pages ${config.startPage}-${config.endPage})`,
          undefined,
          { 
            chunkIndex: i, 
            startPage: config.startPage, 
            endPage: config.endPage,
            fileName: document.metadata.fileName 
          }
        );

        // For now, we'll extract pages using a simple approach
        // In a production system, you might use a PDF library like pdf-lib
        const chunkBuffer = await this.extractPDFPages(
          document.buffer, 
          config.startPage, 
          config.endPage
        );

        const chunk: DocumentChunk = {
          buffer: chunkBuffer,
          chunkIndex: i,
          startPage: config.startPage,
          endPage: config.endPage,
          pageCount: config.pageCount,
          metadata: {
            originalFileName: document.metadata.fileName,
            originalPageCount,
            totalChunks: chunkConfig.length,
            fileType: document.metadata.fileType
          }
        };

        chunks.push(chunk);

      } catch (error) {
        throw new DocumentProcessingError(
          `Failed to create chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CHUNK_CREATION_FAILED'
        );
      }
    }

    return chunks;
  }

  /**
   * Extract specific pages from a PDF buffer
   * Uses pdf-lib to create a new PDF with only the specified page range
   */
  private static async extractPDFPages(
    pdfBuffer: Buffer,
    startPage: number,
    endPage: number
  ): Promise<Buffer> {
    try {
      // Load the PDF document (ignore encryption for read-only operations)
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      
      // Create a new PDF document
      const newPdfDoc = await PDFDocument.create();
      
      // Copy pages from startPage to endPage (1-indexed to 0-indexed conversion)
      const pagesToCopy = [];
      for (let i = startPage - 1; i < endPage; i++) {
        pagesToCopy.push(i);
      }
      
      // Copy the pages
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToCopy);
      
      // Add the copied pages to the new document
      for (const page of copiedPages) {
        newPdfDoc.addPage(page);
      }
      
      // Save the new PDF to a buffer
      const pdfBytes = await newPdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      DocumentLogger.logStep(
        'PDF Page Extraction',
        `Failed to extract pages ${startPage}-${endPage}`,
        undefined,
        { 
          startPage, 
          endPage, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      );
      
      throw new DocumentProcessingError(
        `Failed to extract pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PAGE_EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Combine text results from multiple chunks
   */
  static combineChunkResults(
    chunkResults: Array<{ 
      text: string; 
      chunkIndex: number; 
      startPage: number; 
      endPage: number; 
      success: boolean;
      error?: string;
    }>
  ): {
    combinedText: string;
    totalChunks: number;
    successfulChunks: number;
    failedChunks: number;
    errors: string[];
  } {
    const sortedResults = chunkResults.sort((a, b) => a.chunkIndex - b.chunkIndex);
    const textSections: string[] = [];
    const errors: string[] = [];
    let successfulChunks = 0;

    for (const result of sortedResults) {
      if (result.success && result.text.trim()) {
        textSections.push(
          `\n--- Pages ${result.startPage}-${result.endPage} ---\n${result.text.trim()}`
        );
        successfulChunks++;
      } else {
        const error = `Chunk ${result.chunkIndex + 1} (pages ${result.startPage}-${result.endPage}) failed: ${result.error || 'No text extracted'}`;
        errors.push(error);
        textSections.push(`\n--- Pages ${result.startPage}-${result.endPage} (FAILED) ---\n[Error: ${result.error || 'No text extracted'}]`);
      }
    }

    const combinedText = textSections.join('\n\n');
    
    return {
      combinedText,
      totalChunks: chunkResults.length,
      successfulChunks,
      failedChunks: chunkResults.length - successfulChunks,
      errors
    };
  }
}