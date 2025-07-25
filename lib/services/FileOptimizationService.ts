// File Optimization Service
// Handles large file compression, optimization, and alternative storage strategies

import { logger } from '@/lib/utils/logger';

export interface OptimizationResult {
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  optimizedBuffer?: Buffer;
  strategy: 'none' | 'compress' | 'resize' | 'split' | 'reject';
  error?: string;
  estimatedProcessingTime: number;
}

export interface OptimizationOptions {
  maxSize: number; // Maximum allowed size in bytes
  quality: number; // Quality setting (0-100)
  targetSize?: number; // Target size to achieve
  allowSplitting?: boolean; // Allow splitting large PDFs
  preserveQuality?: boolean; // Prefer quality over size
}

export class FileOptimizationService {
  private readonly maxSizeLimit = 100 * 1024 * 1024; // 100MB absolute limit
  private readonly warningSize = 10 * 1024 * 1024; // 10MB warning threshold
  private readonly compressionThreshold = 5 * 1024 * 1024; // 5MB compression threshold

  /**
   * Analyze file and determine optimization strategy
   */
  async analyzeFile(
    buffer: Buffer, 
    fileName: string, 
    options: OptimizationOptions
  ): Promise<{
    needsOptimization: boolean;
    recommendedStrategy: 'none' | 'compress' | 'resize' | 'split' | 'reject';
    estimatedFinalSize: number;
    warnings: string[];
  }> {
    const fileSize = buffer.length;
    const fileType = this.detectFileType(buffer);
    const warnings: string[] = [];

    logger.debug('Analyzing file for optimization', {
      fileName,
      fileSize,
      fileType,
      maxSize: options.maxSize
    });

    // Check absolute limits
    if (fileSize > this.maxSizeLimit) {
      return {
        needsOptimization: true,
        recommendedStrategy: 'reject',
        estimatedFinalSize: fileSize,
        warnings: [`File size (${this.formatSize(fileSize)}) exceeds absolute limit (${this.formatSize(this.maxSizeLimit)})`]
      };
    }

    // Check if file is already within limits
    if (fileSize <= options.maxSize) {
      return {
        needsOptimization: false,
        recommendedStrategy: 'none',
        estimatedFinalSize: fileSize,
        warnings: fileSize > this.warningSize ? [`Large file (${this.formatSize(fileSize)}) may take longer to process`] : []
      };
    }

    // Determine optimization strategy based on file type and size
    let recommendedStrategy: 'compress' | 'resize' | 'split' = 'compress';
    let estimatedFinalSize = fileSize;

    if (fileType === 'pdf') {
      // For PDFs, compression is usually most effective
      if (fileSize > 50 * 1024 * 1024) {
        recommendedStrategy = 'split';
        estimatedFinalSize = fileSize / 2; // Rough estimate
        warnings.push('Large PDF will be split into smaller sections');
      } else {
        recommendedStrategy = 'compress';
        estimatedFinalSize = Math.round(fileSize * 0.6); // Estimated 40% reduction
        warnings.push('PDF will be compressed - some quality may be lost');
      }
    } else if (fileType === 'image') {
      // For images, resizing and compression
      recommendedStrategy = 'resize';
      estimatedFinalSize = Math.round(fileSize * 0.4); // Estimated 60% reduction
      warnings.push('Image will be optimized - resolution may be reduced');
    } else {
      // Generic compression for other types
      recommendedStrategy = 'compress';
      estimatedFinalSize = Math.round(fileSize * 0.7); // Conservative estimate
      warnings.push('File will be compressed');
    }

    return {
      needsOptimization: true,
      recommendedStrategy,
      estimatedFinalSize,
      warnings
    };
  }

  /**
   * Optimize file based on analysis
   */
  async optimizeFile(
    buffer: Buffer,
    fileName: string,
    options: OptimizationOptions
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize = buffer.length;

    try {
      logger.info('Starting file optimization', {
        fileName,
        originalSize,
        maxSize: options.maxSize
      });

      // Analyze file first
      const analysis = await this.analyzeFile(buffer, fileName, options);

      if (analysis.recommendedStrategy === 'reject') {
        return {
          success: false,
          originalSize,
          optimizedSize: originalSize,
          compressionRatio: 1,
          strategy: 'reject',
          error: analysis.warnings[0] || 'File too large to process',
          estimatedProcessingTime: Date.now() - startTime
        };
      }

      if (analysis.recommendedStrategy === 'none') {
        return {
          success: true,
          originalSize,
          optimizedSize: originalSize,
          compressionRatio: 1,
          optimizedBuffer: buffer,
          strategy: 'none',
          estimatedProcessingTime: Date.now() - startTime
        };
      }

      // Perform optimization based on strategy
      let optimizedBuffer: Buffer;
      let strategy = analysis.recommendedStrategy;

      switch (analysis.recommendedStrategy) {
        case 'compress':
          optimizedBuffer = await this.compressFile(buffer, fileName, options);
          break;
        case 'resize':
          optimizedBuffer = await this.resizeImage(buffer, options);
          break;
        case 'split':
          // For now, just compress heavily instead of splitting
          // TODO: Implement actual PDF splitting
          optimizedBuffer = await this.compressFile(buffer, fileName, { ...options, quality: 30 });
          strategy = 'compress';
          break;
        default:
          throw new Error(`Unsupported optimization strategy: ${analysis.recommendedStrategy}`);
      }

      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = originalSize / optimizedSize;

      // Verify optimization was successful
      if (optimizedSize > options.maxSize) {
        logger.warn('Optimization did not achieve target size', {
          fileName,
          originalSize,
          optimizedSize,
          maxSize: options.maxSize
        });

        return {
          success: false,
          originalSize,
          optimizedSize,
          compressionRatio,
          strategy,
          error: `Optimized file (${this.formatSize(optimizedSize)}) still exceeds limit (${this.formatSize(options.maxSize)})`,
          estimatedProcessingTime: Date.now() - startTime
        };
      }

      logger.info('File optimization completed successfully', {
        fileName,
        originalSize,
        optimizedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        strategy,
        processingTimeMs: Date.now() - startTime
      });

      return {
        success: true,
        originalSize,
        optimizedSize,
        compressionRatio,
        optimizedBuffer,
        strategy,
        estimatedProcessingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('File optimization failed', error, {
        fileName,
        originalSize
      });

      return {
        success: false,
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 1,
        strategy: 'compress',
        error: error instanceof Error ? error.message : 'Optimization failed',
        estimatedProcessingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get user-friendly recommendations for large files
   */
  getOptimizationRecommendations(
    fileSize: number,
    fileName: string
  ): {
    canOptimize: boolean;
    recommendations: string[];
    alternatives: string[];
  } {
    const fileType = this.getFileTypeFromName(fileName);
    const recommendations: string[] = [];
    const alternatives: string[] = [];

    if (fileSize <= 50 * 1024 * 1024) {
      return {
        canOptimize: true,
        recommendations: ['File size is acceptable and can be processed'],
        alternatives: []
      };
    }

    // Size-based recommendations
    if (fileType === 'pdf') {
      recommendations.push(
        'Compress PDF using online tools (reduce image quality)',
        'Remove unnecessary pages or appendices',
        'Split large PDF into main sections'
      );
      alternatives.push(
        'Save as lower quality PDF',
        'Convert images within PDF to JPEG',
        'Use PDF optimization software'
      );
    } else if (fileType === 'image') {
      recommendations.push(
        'Reduce image resolution (e.g., from 300 DPI to 150 DPI)',
        'Convert to JPEG format with 80% quality',
        'Crop to remove unnecessary areas'
      );
      alternatives.push(
        'Use image compression tools',
        'Convert to WebP format',
        'Split image into sections if it contains multiple pages'
      );
    } else {
      recommendations.push(
        'Compress file using ZIP or similar',
        'Convert to a more efficient format',
        'Remove metadata and embedded objects'
      );
    }

    // Universal alternatives
    alternatives.push(
      'Upload to Google Drive and share link instead',
      'Use a file transfer service like WeTransfer',
      'Email the file as a link rather than attachment'
    );

    return {
      canOptimize: fileSize < this.maxSizeLimit,
      recommendations,
      alternatives
    };
  }

  /**
   * Private: Compress file (placeholder - would need actual compression libraries)
   */
  private async compressFile(buffer: Buffer, fileName: string, options: OptimizationOptions): Promise<Buffer> {
    // This is a placeholder implementation
    // In a real implementation, you would use libraries like:
    // - pdf-lib for PDF compression
    // - sharp for image compression
    // - node-zip for general compression

    logger.warn('File compression not yet implemented - returning original buffer', {
      fileName,
      originalSize: buffer.length
    });

    // For now, just return the original buffer
    // TODO: Implement actual file compression
    return buffer;
  }

  /**
   * Private: Resize image (placeholder)
   */
  private async resizeImage(buffer: Buffer, options: OptimizationOptions): Promise<Buffer> {
    // Placeholder for image resizing using sharp or similar
    logger.warn('Image resizing not yet implemented - returning original buffer');
    return buffer;
  }

  /**
   * Private: Detect file type from buffer
   */
  private detectFileType(buffer: Buffer): 'pdf' | 'image' | 'unknown' {
    // Check PDF signature
    if (buffer.subarray(0, 4).toString() === '%PDF') {
      return 'pdf';
    }

    // Check common image signatures
    const imageSignatures = [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0x47, 0x49, 0x46], // GIF
      [0x42, 0x4D], // BMP
    ];

    for (const signature of imageSignatures) {
      if (buffer.subarray(0, signature.length).equals(Buffer.from(signature))) {
        return 'image';
      }
    }

    return 'unknown';
  }

  /**
   * Private: Get file type from filename
   */
  private getFileTypeFromName(fileName: string): 'pdf' | 'image' | 'unknown' {
    const extension = fileName.toLowerCase().split('.').pop();
    
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'].includes(extension || '')) return 'image';
    
    return 'unknown';
  }

  /**
   * Private: Format file size for display
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }
}

// Export singleton instance
export const fileOptimization = new FileOptimizationService();