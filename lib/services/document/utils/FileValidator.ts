/**
 * File validation and type detection utility
 * Clean, testable, no magic numbers or strings
 */

import { SupportedFileType, UnsupportedFileTypeError } from '../types/DocumentTypes';

interface FileSignature {
  readonly signature: string;
  readonly type: SupportedFileType;
  readonly description: string;
}

export class FileValidator {
  private static readonly FILE_SIGNATURES: readonly FileSignature[] = [
    {
      signature: '25504446', // %PDF
      type: SupportedFileType.PDF,
      description: 'PDF Document'
    },
    {
      signature: 'ffd8ff', // JPEG
      type: SupportedFileType.JPEG,
      description: 'JPEG Image'
    },
    {
      signature: '89504e47', // PNG
      type: SupportedFileType.PNG,
      description: 'PNG Image'
    }
  ] as const;

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MIN_FILE_SIZE = 100; // 100 bytes

  /**
   * Detect file type based on file signature (magic bytes)
   */
  static detectFileType(buffer: Buffer): SupportedFileType {
    if (!buffer || buffer.length < 4) {
      return SupportedFileType.UNKNOWN;
    }

    const headerHex = buffer.slice(0, 4).toString('hex').toLowerCase();
    
    for (const sig of this.FILE_SIGNATURES) {
      if (headerHex.startsWith(sig.signature)) {
        return sig.type;
      }
    }

    return SupportedFileType.UNKNOWN;
  }

  /**
   * Validate file size constraints
   */
  static validateFileSize(size: number): void {
    if (size < this.MIN_FILE_SIZE) {
      throw new UnsupportedFileTypeError(`File too small: ${size} bytes`);
    }
    
    if (size > this.MAX_FILE_SIZE) {
      throw new UnsupportedFileTypeError(
        `File too large: ${size} bytes. Maximum allowed: ${this.MAX_FILE_SIZE} bytes`
      );
    }
  }

  /**
   * Check if file type is supported for processing
   */
  static isSupportedType(fileType: SupportedFileType): boolean {
    return fileType !== SupportedFileType.UNKNOWN;
  }

  /**
   * Get human-readable description for file type
   */
  static getFileTypeDescription(fileType: SupportedFileType): string {
    const signature = this.FILE_SIGNATURES.find(sig => sig.type === fileType);
    return signature?.description ?? 'Unknown file type';
  }

  /**
   * Comprehensive file validation
   */
  static validateFile(buffer: Buffer, fileName: string, fileSize: number): {
    fileType: SupportedFileType;
    isValid: boolean;
    validationErrors: string[];
  } {
    const errors: string[] = [];
    
    try {
      this.validateFileSize(fileSize);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'File size validation failed');
    }

    const fileType = this.detectFileType(buffer);
    
    if (!this.isSupportedType(fileType)) {
      errors.push(`Unsupported file type detected for: ${fileName}`);
    }

    return {
      fileType,
      isValid: errors.length === 0,
      validationErrors: errors
    };
  }

  /**
   * Check if buffer appears to be a real PDF with text content
   */
  static isPdfWithText(buffer: Buffer): boolean {
    if (this.detectFileType(buffer) !== SupportedFileType.PDF) {
      return false;
    }

    // Look for text content indicators in PDF
    const pdfContent = buffer.toString('ascii', 0, Math.min(buffer.length, 2048));
    return pdfContent.includes('/Type') && pdfContent.includes('/Page');
  }

  /**
   * Check if file appears to be an image masquerading as PDF
   */
  static isImageFile(buffer: Buffer): boolean {
    const fileType = this.detectFileType(buffer);
    return fileType === SupportedFileType.JPEG || fileType === SupportedFileType.PNG;
  }
}