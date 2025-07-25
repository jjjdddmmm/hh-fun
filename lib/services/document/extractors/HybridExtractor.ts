/**
 * Hybrid Extractor - Combines Google Vision OCR + Anthropic Vision
 * Uses Google Vision for fast text extraction, then Anthropic for intelligent analysis
 */

import { DocumentExtractor, DocumentBuffer, ExtractionResult, ExtractorConfig, SupportedFileType, ExtractionMethod } from '../types/DocumentTypes';
import { DocumentLogger } from '../utils/DocumentLogger';
import { GoogleVisionExtractor } from './GoogleVisionExtractor';
import { VisionExtractor } from './VisionExtractor';
import { logger } from '@/lib/utils/logger';

export class HybridExtractor implements DocumentExtractor {
  readonly name = 'HybridExtractor';
  readonly supportedTypes = [SupportedFileType.PDF, SupportedFileType.JPEG, SupportedFileType.PNG] as const;
  
  private readonly visionExtractor: VisionExtractor;
  private readonly googleVisionExtractor: GoogleVisionExtractor;
  private readonly ocrTimeout = 30000; // 30 seconds for OCR
  private readonly analysisTimeout = 90000; // 90 seconds for full analysis

  constructor() {
    this.visionExtractor = new VisionExtractor();
    this.googleVisionExtractor = new GoogleVisionExtractor();
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
    const fileName = document.metadata.fileName;

    try {
      logger.info('Starting hybrid extraction', { 
        fileName,
        fileSize: document.metadata.fileSize,
        fileType: document.metadata.fileType
      });

      // Step 1: Fast OCR extraction using Google Vision
      const ocrResult = await this.performGoogleVisionOCR(document, config);
      
      // Step 2: Enhanced Anthropic analysis with OCR context
      const analysisResult = await this.performEnhancedAnalysis(
        document, 
        ocrResult, 
        config
      );

      const processingTimeMs = Date.now() - startTime;

      // Combine results for optimal output
      const finalResult = this.combineResults(ocrResult, analysisResult, processingTimeMs);

      logger.info('Hybrid extraction completed', {
        fileName,
        success: finalResult.success,
        textLength: finalResult.extractedText.length,
        processingTimeMs,
        ocrSuccess: ocrResult.success,
        analysisSuccess: analysisResult.success
      });

      return finalResult;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Hybrid extraction failed';

      logger.error('Hybrid extraction failed', error, { 
        fileName,
        processingTimeMs 
      });

      // Fallback to pure Anthropic Vision if hybrid fails
      logger.warn('Falling back to pure Anthropic Vision analysis', { fileName });
      return await this.visionExtractor.extract(document, config);
    }
  }

  /**
   * Step 1: Perform fast OCR extraction using Google Vision
   */
  private async performGoogleVisionOCR(
    document: DocumentBuffer, 
    config: ExtractorConfig
  ): Promise<{ success: boolean; text: string; confidence?: number; error?: string }> {
    try {
      DocumentLogger.logStep('OCR Extraction', 'Starting Google Vision OCR', {
        fileName: document.metadata.fileName
      });

      // Check if Google Vision can handle this file type
      if (!this.googleVisionExtractor.canHandle(document.metadata.fileType)) {
        logger.warn('Google Vision OCR not supported for file type', { 
          fileType: document.metadata.fileType
        });
        return { success: false, text: '', error: 'Google Vision OCR not supported for this file type' };
      }

      // Perform Google Vision OCR extraction
      const ocrResult = await this.googleVisionExtractor.extract(document, {
        ...config,
        timeout: this.ocrTimeout
      });

      DocumentLogger.logStep('OCR Extraction', 
        ocrResult.success ? 'Google Vision OCR completed successfully' : 'Google Vision OCR failed', {
        fileName: document.metadata.fileName,
        textLength: ocrResult.extractedText.length,
        processingTimeMs: ocrResult.processingTimeMs,
        pages: ocrResult.metadata.pages
      });

      return {
        success: ocrResult.success,
        text: ocrResult.extractedText,
        confidence: ocrResult.metadata.confidence || 85,
        error: ocrResult.error
      };

    } catch (error) {
      logger.error('Google Vision OCR extraction failed', error, {
        fileName: document.metadata.fileName
      });

      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Google Vision OCR extraction failed'
      };
    }
  }

  /**
   * Step 2: Perform enhanced Anthropic analysis with OCR context
   */
  private async performEnhancedAnalysis(
    document: DocumentBuffer,
    ocrResult: { success: boolean; text: string; confidence?: number },
    config: ExtractorConfig
  ): Promise<ExtractionResult> {
    try {
      DocumentLogger.logStep('Enhanced Analysis', 'Starting Anthropic Vision with Google Vision OCR context', {
        fileName: document.metadata.fileName,
        hasOcrText: ocrResult.success && ocrResult.text.length > 0
      });

      // Create enhanced prompt that includes OCR context
      const enhancedConfig = {
        ...config,
        customPrompt: this.createEnhancedPrompt(ocrResult, config.customPrompt)
      };

      // Use VisionExtractor with enhanced configuration
      const analysisResult = await this.visionExtractor.extract(document, enhancedConfig);

      DocumentLogger.logStep('Enhanced Analysis', 
        analysisResult.success ? 'Analysis completed successfully' : 'Analysis failed', {
        fileName: document.metadata.fileName,
        analysisLength: analysisResult.extractedText.length,
        processingTimeMs: analysisResult.processingTimeMs
      });

      return analysisResult;

    } catch (error) {
      logger.error('Enhanced analysis failed', error, {
        fileName: document.metadata.fileName
      });

      // Return failure result
      return {
        success: false,
        extractedText: '',
        method: ExtractionMethod.HYBRID,
        metadata: {
          fileName: document.metadata.fileName,
          fileSize: document.metadata.fileSize,
          processingTimeMs: Date.now() - Date.now(),
          confidence: 0,
          pages: 1
        },
        processingTimeMs: Date.now() - Date.now(),
        error: error instanceof Error ? error.message : 'Enhanced analysis failed'
      };
    }
  }

  /**
   * Create enhanced prompt that includes OCR context
   */
  private createEnhancedPrompt(
    ocrResult: { success: boolean; text: string; confidence?: number },
    originalPrompt?: string
  ): string {
    const basePrompt = originalPrompt || `
      Analyze this inspection report and provide:
      1. CREDIT RECOMMENDATIONS: Specific repair items and estimated costs
      2. NEGOTIATION TALKING POINTS: How to present each issue to the seller
      3. STRATEGIC CONTEXT: Why each issue matters for pricing and negotiations
    `;

    if (ocrResult.success && ocrResult.text.length > 100) {
      return `
        ${basePrompt}
        
        GOOGLE VISION EXTRACTED TEXT (for reference):
        "${ocrResult.text.substring(0, 2000)}${ocrResult.text.length > 2000 ? '...' : ''}"
        
        Using the Google Vision OCR text above as context, please analyze the visual document and provide your insights. 
        Cross-reference the visual elements with the extracted text to ensure accuracy.
        Focus on actionable negotiation insights and specific repair recommendations.
      `;
    } else {
      return `
        ${basePrompt}
        
        Note: Google Vision OCR text extraction was not available or successful. Please analyze the visual document directly.
      `;
    }
  }

  /**
   * Combine OCR and analysis results for optimal output
   */
  private combineResults(
    ocrResult: { success: boolean; text: string; confidence?: number },
    analysisResult: ExtractionResult,
    processingTimeMs: number
  ): ExtractionResult {
    // If analysis was successful, use it as primary result
    if (analysisResult.success) {
      return {
        ...analysisResult,
        processingTimeMs,
        method: ExtractionMethod.HYBRID,
        metadata: {
          ...analysisResult.metadata,
          processingTimeMs,
          hybridProcessing: {
            ocrSuccess: ocrResult.success,
            ocrTextLength: ocrResult.text.length,
            ocrConfidence: ocrResult.confidence,
            analysisSuccess: analysisResult.success
          }
        }
      };
    }

    // If analysis failed but OCR succeeded, return OCR text with error note
    if (ocrResult.success && ocrResult.text.length > 50) {
      return {
        success: true, // OCR succeeded, so partial success
        extractedText: `${ocrResult.text}\n\n[Note: Advanced analysis failed, showing OCR text only]`,
        method: ExtractionMethod.HYBRID,
        metadata: {
          fileName: analysisResult.metadata.fileName,
          fileSize: analysisResult.metadata.fileSize,
          processingTimeMs,
          confidence: ocrResult.confidence || 70,
          pages: 1,
          hybridProcessing: {
            ocrSuccess: true,
            ocrTextLength: ocrResult.text.length,
            ocrConfidence: ocrResult.confidence,
            analysisSuccess: false
          }
        },
        processingTimeMs,
        error: 'Analysis failed, OCR text only'
      };
    }

    // Both failed, return the analysis failure (more informative)
    return {
      ...analysisResult,
      processingTimeMs,
      method: ExtractionMethod.HYBRID,
      error: `Hybrid extraction failed: OCR ${ocrResult.success ? 'succeeded' : 'failed'}, Analysis failed`
    };
  }

  /**
   * Convert file type to MIME type for OCR support check
   */
  private getMimeType(fileType: SupportedFileType): string {
    switch (fileType) {
      case SupportedFileType.PDF:
        return 'application/pdf';
      case SupportedFileType.JPEG:
        return 'image/jpeg';
      case SupportedFileType.PNG:
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }
}