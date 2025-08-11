/**
 * PDF Page Counter utility
 * Efficiently counts pages in PDF buffers without external dependencies
 * Clean implementation for determining if chunking is needed
 */

import { DocumentLogger } from './DocumentLogger';

export interface PageCountResult {
  pageCount: number;
  success: boolean;
  error?: string;
  processingTimeMs: number;
}

export class PDFPageCounter {
  private static readonly MAX_CHUNK_SIZE = 15; // Safe limit for Google Vision non-imageless mode
  private static readonly GOOGLE_VISION_LIMIT = 30;

  /**
   * Count pages in a PDF buffer using efficient parsing
   */
  static async countPages(pdfBuffer: Buffer, fileName?: string): Promise<PageCountResult> {
    const startTime = Date.now();
    
    try {
      DocumentLogger.logStep(
        'Page Count', 
        'Starting PDF page counting', 
        undefined,
        { fileName, fileSize: pdfBuffer.length }
      );

      const pageCount = this.parsePageCount(pdfBuffer);
      const processingTimeMs = Date.now() - startTime;

      DocumentLogger.logStep(
        'Page Count', 
        `PDF contains ${pageCount} pages`, 
        undefined,
        { fileName, pageCount, processingTimeMs }
      );

      return {
        pageCount,
        success: true,
        processingTimeMs
      };

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Page counting failed';
      
      DocumentLogger.logStep(
        'Page Count', 
        `Page counting failed: ${errorMessage}`, 
        undefined,
        { fileName, processingTimeMs, error: errorMessage }
      );

      return {
        pageCount: 0,
        success: false,
        error: errorMessage,
        processingTimeMs
      };
    }
  }

  /**
   * Determine if a PDF needs chunking based on page count
   */
  static needsChunking(pageCount: number): boolean {
    return pageCount > this.GOOGLE_VISION_LIMIT;
  }

  /**
   * Calculate optimal chunk configuration for a PDF
   */
  static calculateChunks(pageCount: number): {
    needsChunking: boolean;
    chunkSize: number;
    chunkCount: number;
    chunks: Array<{ startPage: number; endPage: number; pageCount: number }>;
  } {
    if (!this.needsChunking(pageCount)) {
      return {
        needsChunking: false,
        chunkSize: pageCount,
        chunkCount: 1,
        chunks: [{ startPage: 1, endPage: pageCount, pageCount }]
      };
    }

    const chunkSize = this.MAX_CHUNK_SIZE;
    const chunkCount = Math.ceil(pageCount / chunkSize);
    const chunks = [];

    for (let i = 0; i < chunkCount; i++) {
      const startPage = (i * chunkSize) + 1;
      const endPage = Math.min((i + 1) * chunkSize, pageCount);
      chunks.push({
        startPage,
        endPage,
        pageCount: endPage - startPage + 1
      });
    }

    return {
      needsChunking: true,
      chunkSize,
      chunkCount,
      chunks
    };
  }

  /**
   * Parse page count from PDF buffer using PDF structure
   */
  private static parsePageCount(buffer: Buffer): number {
    try {
      // Convert buffer to string for parsing
      const pdfString = buffer.toString('binary');
      
      // Method 1: Look for /Count in page tree
      const countMatches = pdfString.match(/\/Count\s+(\d+)/g);
      if (countMatches && countMatches.length > 0) {
        // Find the highest count (should be the page count)
        const counts = countMatches.map(match => {
          const num = match.match(/(\d+)/);
          return num ? parseInt(num[1], 10) : 0;
        });
        const maxCount = Math.max(...counts);
        if (maxCount > 0) return maxCount;
      }

      // Method 2: Look for /Type /Page instances
      const pageMatches = pdfString.match(/\/Type\s*\/Page\s/g);
      if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
      }

      // Method 3: Look for page object references
      const pageObjMatches = pdfString.match(/\d+\s+0\s+obj\s*<<[^>]*\/Type\s*\/Page/g);
      if (pageObjMatches && pageObjMatches.length > 0) {
        return pageObjMatches.length;
      }

      // Method 4: Look for Kids array length in page tree
      const kidsMatch = pdfString.match(/\/Kids\s*\[\s*([^\]]+)\]/);
      if (kidsMatch) {
        const kids = kidsMatch[1].trim().split(/\s+/);
        const pageRefs = kids.filter(kid => kid.match(/\d+\s+\d+\s+R/));
        if (pageRefs.length > 0) return pageRefs.length;
      }

      // Fallback: Estimate based on file size (rough heuristic)
      const estimatedPages = Math.max(1, Math.floor(buffer.length / 50000)); // ~50KB per page
      
      DocumentLogger.logStep(
        'Page Count', 
        `Using estimated page count: ${estimatedPages}`, 
        undefined,
        { method: 'size-estimation', fileSize: buffer.length }
      );

      return estimatedPages;

    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if page count seems reasonable
   */
  static validatePageCount(pageCount: number, fileSize: number): {
    isValid: boolean;
    warning?: string;
  } {
    const avgPageSize = fileSize / pageCount;
    
    // Very small pages might indicate parsing error
    if (avgPageSize < 1000) { // Less than 1KB per page
      return {
        isValid: false,
        warning: `Suspiciously small average page size: ${Math.round(avgPageSize)} bytes`
      };
    }

    // Very large pages might indicate parsing error  
    if (avgPageSize > 10 * 1024 * 1024) { // More than 10MB per page
      return {
        isValid: false,
        warning: `Suspiciously large average page size: ${Math.round(avgPageSize / 1024 / 1024)}MB`
      };
    }

    return { isValid: true };
  }
}