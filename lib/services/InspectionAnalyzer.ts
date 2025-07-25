// InspectionAnalyzer - Production-ready AI analysis service
// Zero tech debt implementation with Claude integration

import Anthropic from '@anthropic-ai/sdk';
import { logger } from "@/lib/utils/logger";
import { DocumentProcessor, ExtractionResult } from './document';
import { 
  InspectionAnalysisResult, 
  InspectionReportType, 
  InspectionIssue,
  InspectionSection,
  InspectionSummary,
  ANALYSIS_CONFIDENCE
} from '@/lib/types/inspection';
import { 
  INSPECTION_ANALYSIS_SYSTEM_PROMPT, 
  INSPECTION_ANALYSIS_USER_PROMPT 
} from '@/lib/prompts/inspectionAnalysis';

export interface AnalysisOptions {
  reportType: InspectionReportType;
  propertyLocation?: string;
  homeAge?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface AnalysisProgress {
  stage: 'parsing' | 'extracting' | 'analyzing' | 'refining' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  timeElapsed: number;
}

export class InspectionAnalyzer {
  private static anthropic: Anthropic | null = null;
  private static readonly DEFAULT_TIMEOUT = 60000; // 60 seconds
  private static readonly MAX_RETRIES = 2;

  /**
   * Initialize Anthropic client (lazy initialization)
   */
  private static getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      this.anthropic = new Anthropic({ apiKey });
    }
    return this.anthropic;
  }

  /**
   * Analyze inspection report from PDF buffer
   */
  static async analyzeFromBuffer(
    buffer: Buffer,
    options: AnalysisOptions,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<InspectionAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Stage 1: PDF Processing
      onProgress?.({
        stage: 'parsing',
        progress: 10,
        message: 'Extracting text from PDF...',
        timeElapsed: Date.now() - startTime
      });

      const processor = new DocumentProcessor();
      const extractionResult = await processor.processBuffer(
        buffer,
        'inspection-report.pdf',
        {
          fallbackEnabled: true,
          timeout: 120000
        }
      );
      
      if (!extractionResult.success || !extractionResult.extractedText) {
        throw new Error(extractionResult.error || 'Failed to extract text from document');
      }

      return await this.analyzeFromText(extractionResult, options, onProgress, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
      logger.error('Inspection analysis error:', error);
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: errorMessage,
        timeElapsed: Date.now() - startTime
      });

      throw new Error(`Analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze inspection report from File object
   */
  static async analyzeFromFile(
    file: File,
    options: AnalysisOptions,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<InspectionAnalysisResult> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return this.analyzeFromBuffer(buffer, options, onProgress);
  }

  /**
   * Analyze inspection report from extracted text
   */
  private static async analyzeFromText(
    extractionResult: ExtractionResult,
    options: AnalysisOptions,
    onProgress?: (progress: AnalysisProgress) => void,
    startTime: number = Date.now()
  ): Promise<InspectionAnalysisResult> {
    
    // Stage 2: Text Preprocessing
    onProgress?.({
      stage: 'extracting',
      progress: 25,
      message: 'Preprocessing report sections...',
      timeElapsed: Date.now() - startTime
    });

    const sections = this.parseTextIntoSections(extractionResult.extractedText);
    
    // Stage 3: AI Analysis
    onProgress?.({
      stage: 'analyzing',
      progress: 40,
      message: 'Analyzing issues with AI...',
      timeElapsed: Date.now() - startTime
    });

    const aiAnalysis = await this.performAIAnalysis(
      extractionResult.extractedText,
      options,
      options.maxRetries || this.MAX_RETRIES
    );

    // Stage 4: Result Processing
    onProgress?.({
      stage: 'refining',
      progress: 80,
      message: 'Refining cost estimates...',
      timeElapsed: Date.now() - startTime
    });

    const analysisResult = this.buildAnalysisResult(
      aiAnalysis,
      extractionResult,
      sections,
      options,
      Date.now() - startTime
    );

    // Stage 5: Complete
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: `Analysis complete - ${analysisResult.issues.length} issues found`,
      timeElapsed: Date.now() - startTime
    });

    return analysisResult;
  }

  /**
   * Perform AI analysis with retry logic
   */
  private static async performAIAnalysis(
    text: string,
    options: AnalysisOptions,
    maxRetries: number
  ): Promise<any> {
    const anthropic = this.getAnthropicClient();
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await Promise.race([
          anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8000,
            temperature: 0.1, // Low temperature for consistent, factual analysis
            system: INSPECTION_ANALYSIS_SYSTEM_PROMPT,
            messages: [{
              role: 'user',
              content: INSPECTION_ANALYSIS_USER_PROMPT(
                text,
                options.reportType,
                options.propertyLocation,
                options.homeAge
              )
            }]
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('AI analysis timeout')), 
            options.timeoutMs || this.DEFAULT_TIMEOUT)
          )
        ]);

        // Parse JSON response
        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response format from AI');
        }

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) || 
                         content.text.match(/```\n([\s\S]*?)\n```/) ||
                         [null, content.text];
        
        if (!jsonMatch[1]) {
          throw new Error('No JSON found in AI response');
        }

        const analysis = JSON.parse(jsonMatch[1]);
        
        // Validate response structure
        this.validateAnalysisResponse(analysis);
        
        return analysis;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown AI error');
        logger.warn(`AI analysis attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError || new Error('AI analysis failed after retries');
  }

  /**
   * Validate AI analysis response structure
   */
  private static validateAnalysisResponse(analysis: any): void {
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Invalid analysis response: not an object');
    }

    const required = ['metadata', 'issues', 'summary'];
    for (const field of required) {
      if (!(field in analysis)) {
        throw new Error(`Invalid analysis response: missing ${field}`);
      }
    }

    if (!Array.isArray(analysis.issues)) {
      throw new Error('Invalid analysis response: issues must be an array');
    }

    // Validate at least basic issue structure
    for (const issue of analysis.issues) {
      const requiredIssueFields = ['id', 'category', 'severity', 'title', 'description'];
      for (const field of requiredIssueFields) {
        if (!(field in issue)) {
          throw new Error(`Invalid issue: missing ${field}`);
        }
      }
    }
  }

  /**
   * Build final analysis result
   */
  private static buildAnalysisResult(
    aiAnalysis: any,
    extractionResult: ExtractionResult,
    sections: any[],
    options: AnalysisOptions,
    processingTimeMs: number
  ): InspectionAnalysisResult {
    
    // Process sections with confidence scores
    const processedSections: InspectionSection[] = sections.map((section, index) => ({
      title: section.title,
      content: section.content,
      pageNumber: section.pageNumber || Math.floor(index / 2) + 1,
      issuesFound: aiAnalysis.issues.filter((issue: any) => 
        issue.sectionReference === section.title || 
        section.content.toLowerCase().includes(issue.title.toLowerCase())
      ).length,
      analysisConfidence: this.calculateSectionConfidence(section, aiAnalysis.issues)
    }));

    // Process issues with IDs and validation
    const processedIssues: InspectionIssue[] = aiAnalysis.issues.map((issue: any, index: number) => ({
      ...issue,
      id: issue.id || `issue_${index + 1}`,
      negotiationValue: issue.negotiationValue || issue.estimatedCost?.mostLikely * 0.6,
      estimatedCost: {
        low: issue.estimatedCost?.low || 0,
        high: issue.estimatedCost?.high || 0,
        mostLikely: issue.estimatedCost?.mostLikely || 0,
        professionalRequired: issue.estimatedCost?.professionalRequired ?? true,
        permitRequired: issue.estimatedCost?.permitRequired ?? false,
        ...issue.estimatedCost
      }
    }));

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(
      aiAnalysis,
      extractionResult,
      processedIssues.length
    );

    return {
      reportId: `analysis_${Date.now()}`,
      reportType: options.reportType,
      processingTimeMs,
      extractedText: extractionResult.extractedText,
      sections: processedSections,
      issues: processedIssues,
      summary: {
        ...aiAnalysis.summary,
        priorityIssues: processedIssues
          .filter(issue => issue.severity === 'safety' || issue.riskLevel === 'high')
          .slice(0, 5)
      },
      qualityScore,
      warnings: aiAnalysis.warnings || [],
      metadata: {
        pages: extractionResult.metadata?.pages || 0,
        wordCount: extractionResult.extractedText.split(/\s+/).length,
        inspector: aiAnalysis.metadata?.inspector,
        inspectionDate: aiAnalysis.metadata?.inspectionDate,
        propertyAddress: aiAnalysis.metadata?.propertyAddress,
        ...aiAnalysis.metadata
      }
    };
  }

  /**
   * Calculate confidence score for a section
   */
  private static calculateSectionConfidence(section: any, issues: any[]): number {
    const sectionIssues = issues.filter((issue: any) => 
      issue.sectionReference === section.title ||
      section.content.toLowerCase().includes(issue.title.toLowerCase())
    );

    // Base confidence on section length and issue detail
    let confidence = Math.min(90, section.content.length / 50);
    
    // Boost confidence if we found specific issues
    if (sectionIssues.length > 0) {
      confidence += 10;
    }

    return Math.round(Math.max(50, Math.min(100, confidence)));
  }

  /**
   * Calculate overall analysis quality score
   */
  private static calculateQualityScore(
    aiAnalysis: any,
    extractionResult: ExtractionResult,
    issuesFound: number
  ): number {
    let score = 0;

    // Text extraction quality (30 points)
    if (extractionResult.extractedText && extractionResult.extractedText.length > 1000) score += 30;
    else if (extractionResult.extractedText && extractionResult.extractedText.length > 500) score += 20;
    else score += 10;

    // Issues found (25 points)
    if (issuesFound > 10) score += 25;
    else if (issuesFound > 5) score += 20;
    else if (issuesFound > 0) score += 15;
    else score += 5;

    // Metadata completeness (20 points)
    const metadata = aiAnalysis.metadata || {};
    let metadataScore = 0;
    if (metadata.inspector) metadataScore += 5;
    if (metadata.inspectionDate) metadataScore += 5;
    if (metadata.propertyAddress) metadataScore += 5;
    if (metadata.qualityScore && metadata.qualityScore > 70) metadataScore += 5;
    score += metadataScore;

    // Analysis depth (25 points)
    const hasDetailedCosts = aiAnalysis.issues.some((issue: any) => 
      issue.estimatedCost && issue.estimatedCost.mostLikely > 0
    );
    const hasNegotiationStrategy = aiAnalysis.summary?.recommendedNegotiationStrategy;
    
    if (hasDetailedCosts && hasNegotiationStrategy) score += 25;
    else if (hasDetailedCosts || hasNegotiationStrategy) score += 15;
    else score += 5;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Parse extracted text into logical sections
   */
  private static parseTextIntoSections(text: string): InspectionSection[] {
    const sections: InspectionSection[] = [];
    
    // Split text by common section headers
    const sectionPatterns = [
      /(?:^|\n)(?:EXECUTIVE SUMMARY|SUMMARY|OVERVIEW)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:MAJOR ISSUES|MAJOR CONCERNS|SAFETY ISSUES)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:MINOR ISSUES|MINOR CONCERNS)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:RECOMMENDATIONS|RECOMMENDED REPAIRS)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:ELECTRICAL|ELECTRICAL SYSTEM)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:PLUMBING|PLUMBING SYSTEM)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:HVAC|HEATING|COOLING)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:STRUCTURAL|FOUNDATION)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:ROOF|ROOFING)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:EXTERIOR|SIDING)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:INTERIOR)(?:\s*:?\s*\n?)/im,
      /(?:^|\n)(?:WINDOWS|DOORS)(?:\s*:?\s*\n?)/im
    ];

    let remainingText = text;
    let sectionIndex = 0;

    for (const pattern of sectionPatterns) {
      const match = remainingText.match(pattern);
      if (match && match.index !== undefined) {
        const beforeSection = remainingText.substring(0, match.index).trim();
        const afterMatch = remainingText.substring(match.index + match[0].length);
        
        // Add previous section if it has content
        if (beforeSection && sectionIndex === 0) {
          sections.push({
            title: 'Document Header',
            content: beforeSection,
            pageNumber: 1,
            issuesFound: 0,
            analysisConfidence: ANALYSIS_CONFIDENCE.MEDIUM
          });
        }

        // Find end of current section (next section or end of text)
        let sectionEnd = afterMatch.length;
        for (const nextPattern of sectionPatterns.slice(sectionPatterns.indexOf(pattern) + 1)) {
          const nextMatch = afterMatch.match(nextPattern);
          if (nextMatch && nextMatch.index !== undefined && nextMatch.index < sectionEnd) {
            sectionEnd = nextMatch.index;
          }
        }

        const sectionContent = afterMatch.substring(0, sectionEnd).trim();
        if (sectionContent) {
          sections.push({
            title: match[0].trim().replace(/[:\n]/g, ''),
            content: sectionContent,
            pageNumber: 1,
            issuesFound: 0,
            analysisConfidence: ANALYSIS_CONFIDENCE.HIGH
          });
        }

        remainingText = afterMatch.substring(sectionEnd);
        sectionIndex++;
      }
    }

    // Add any remaining content as final section
    if (remainingText.trim()) {
      sections.push({
        title: 'Additional Information',
        content: remainingText.trim(),
        pageNumber: 1,
        issuesFound: 0,
        analysisConfidence: ANALYSIS_CONFIDENCE.MEDIUM
      });
    }

    // If no sections found, create a single section with all content
    if (sections.length === 0) {
      sections.push({
        title: 'Full Report Content',
        content: text,
        pageNumber: 1,
        issuesFound: 0,
        analysisConfidence: ANALYSIS_CONFIDENCE.MEDIUM
      });
    }

    return sections;
  }
}