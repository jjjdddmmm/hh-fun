/**
 * Claude Opus 4 Analysis Service
 * High-quality inspection report analysis using Claude's most advanced model
 */

import { logger } from "@/lib/utils/logger";

export interface InspectionIssue {
  id: string;
  category: string;
  severity: 'safety' | 'major' | 'minor' | 'cosmetic';
  urgency: 'immediate' | '1-2-years' | 'long-term';
  description: string;
  location: string;
  estimatedCost: {
    low: number;
    high: number;
    mostLikely: number;
    professional: boolean;
  };
  negotiationValue: number;
  riskLevel: 'high' | 'medium' | 'low';
  confidence: number;
  sourceText: string;
  reasoning: string;
}

export interface AnalysisResult {
  success: boolean;
  issues: InspectionIssue[];
  modelUsed: string;
  processingTime: number;
  confidence: number;
  summary: {
    totalIssues: number;
    totalEstimatedCost: number;
    averageConfidence: number;
  };
  error?: string;
}

export class ClaudeAnalysisService {
  private static readonly ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
  private static readonly MODEL_OPUS_4 = 'claude-opus-4-20250514';
  private static readonly MODEL_SONNET_35 = 'claude-3-5-sonnet-20241022';
  private static readonly MAX_TOKENS = 8192;
  private static readonly TIMEOUT = 60000; // 60 seconds

  /**
   * Analyze inspection report with Claude Opus 4 (primary) or Sonnet 3.5 (fallback)
   */
  static async analyzeInspectionReport(
    extractedText: string,
    reportType: string,
    documentName: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Try Claude Opus 4 first
      const opusResult = await this.tryClaudeAnalysis(
        extractedText,
        reportType,
        documentName,
        this.MODEL_OPUS_4
      );
      
      if (opusResult.success) {
        logger.info('Claude Opus 4 analysis successful', {
          documentName,
          issuesFound: opusResult.issues.length,
          processingTime: Date.now() - startTime
        });
        return opusResult;
      }

      // Fallback to Claude 3.5 Sonnet
      logger.warn('Claude Opus 4 failed, trying Sonnet 3.5', {
        documentName,
        error: opusResult.error
      });

      const sonnetResult = await this.tryClaudeAnalysis(
        extractedText,
        reportType,
        documentName,
        this.MODEL_SONNET_35
      );

      if (sonnetResult.success) {
        logger.info('Claude Sonnet 3.5 analysis successful (fallback)', {
          documentName,
          issuesFound: sonnetResult.issues.length,
          processingTime: Date.now() - startTime
        });
        return sonnetResult;
      }

      // Both failed
      throw new Error(`Both Claude models failed: Opus 4: ${opusResult.error}, Sonnet 3.5: ${sonnetResult.error}`);

    } catch (error) {
      logger.error('Claude analysis completely failed', error, {
        documentName,
        reportType,
        processingTime: Date.now() - startTime
      });

      return {
        success: false,
        issues: [],
        modelUsed: 'none',
        processingTime: Date.now() - startTime,
        confidence: 0,
        summary: {
          totalIssues: 0,
          totalEstimatedCost: 0,
          averageConfidence: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Try analysis with a specific Claude model
   */
  private static async tryClaudeAnalysis(
    extractedText: string,
    reportType: string,
    documentName: string,
    model: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not found in environment variables');
      }

      const prompt = this.createAnalysisPrompt(extractedText, reportType, documentName);

      const response = await fetch(this.ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: this.MAX_TOKENS,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.1, // Low temperature for consistent analysis
          system: "You are an expert inspection report analyst with 20+ years of experience in home, commercial, and specialty inspections. You provide accurate, detailed, and actionable analysis for real estate negotiations."
        }),
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.content[0]?.text;

      if (!analysisText) {
        logger.error('No analysis text in Claude response', { data });
        throw new Error('No analysis text returned from Claude');
      }

      logger.debug('Claude analysis text received', { 
        model, 
        textLength: analysisText.length,
        textPreview: analysisText.substring(0, 500)
      });

      // Parse the JSON response from Claude
      const analysisResult = this.parseClaudeResponse(analysisText, model, Date.now() - startTime);
      
      return {
        ...analysisResult,
        success: true
      };

    } catch (error) {
      logger.error('Claude analysis failed', error, { model, processingTime: Date.now() - startTime });
      return {
        success: false,
        issues: [],
        modelUsed: model,
        processingTime: Date.now() - startTime,
        confidence: 0,
        summary: {
          totalIssues: 0,
          totalEstimatedCost: 0,
          averageConfidence: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create sophisticated analysis prompt for Claude
   */
  private static createAnalysisPrompt(extractedText: string, reportType: string, documentName: string): string {
    return `You are analyzing a ${reportType} inspection report. Please provide a thorough analysis following these guidelines:

DOCUMENT INFORMATION:
- Document: ${documentName}
- Type: ${reportType} inspection
- Your task: Extract all legitimate issues that could be used for repair credit negotiations

ANALYSIS REQUIREMENTS:
1. **Only identify real issues** mentioned in the report - do not invent problems
2. **Ignore access points, inspection methods, or normal conditions** (e.g., "Roof Vent" as access point ≠ roofing issue)
3. **Focus on actual problems, defects, or recommendations for repair**
4. **Provide accurate cost estimates** based on current market rates
5. **Include confidence scores** (0.0-1.0) for each issue identification

Please return your analysis as a JSON object with this exact structure:

\`\`\`json
{
  "issues": [
    {
      "id": "issue_1",
      "category": "CATEGORY_NAME",
      "severity": "safety|major|minor|cosmetic",
      "urgency": "immediate|1-2-years|long-term",
      "description": "Clear description of the actual problem",
      "location": "Specific location in property",
      "estimatedCost": {
        "low": 0,
        "high": 0,
        "mostLikely": 0,
        "professional": true|false
      },
      "negotiationValue": 0,
      "riskLevel": "high|medium|low",
      "confidence": 0.95,
      "sourceText": "Exact text from report that supports this issue",
      "reasoning": "Why this is a legitimate issue requiring repair"
    }
  ],
  "summary": {
    "documentType": "${reportType}",
    "totalIssuesFound": 0,
    "highConfidenceIssues": 0,
    "analysisNotes": "Brief summary of report condition"
  }
}
\`\`\`

COST ESTIMATION GUIDELINES:
- Research current contractor rates for your area
- Include material and labor costs
- Factor in permit requirements
- Consider professional vs DIY work requirements
- Negotiation value should be 70-90% of estimated cost

SEVERITY CLASSIFICATION:
- **Safety**: Code violations, safety hazards, immediate risks
- **Major**: Significant system failures, expensive repairs
- **Minor**: Maintenance items, moderate cost repairs  
- **Cosmetic**: Aesthetic issues, low-priority items

INSPECTION REPORT TEXT TO ANALYZE:
${extractedText}

Please provide your analysis as valid JSON only - no additional text or explanation outside the JSON structure.`;
  }

  /**
   * Parse Claude's JSON response
   */
  private static parseClaudeResponse(responseText: string, model: string, processingTime: number): AnalysisResult {
    try {
      logger.debug('Parsing Claude response', { 
        model, 
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200)
      });

      // Extract JSON from Claude's response (handles cases where Claude adds explanation)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        logger.error('No JSON found in Claude response', { responseText });
        throw new Error('No JSON found in Claude response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      if (!parsed.issues || !Array.isArray(parsed.issues)) {
        throw new Error('Invalid response structure: missing issues array');
      }

      // Process and validate issues
      const issues: InspectionIssue[] = parsed.issues.map((issue: any, index: number) => ({
        id: issue.id || `claude_issue_${index + 1}`,
        category: issue.category || 'GENERAL',
        severity: issue.severity || 'minor',
        urgency: issue.urgency || 'long-term',
        description: issue.description || 'Issue identified by AI analysis',
        location: issue.location || 'See inspection report',
        estimatedCost: {
          low: Math.max(0, issue.estimatedCost?.low || 0),
          high: Math.max(0, issue.estimatedCost?.high || 0),
          mostLikely: Math.max(0, issue.estimatedCost?.mostLikely || 0),
          professional: issue.estimatedCost?.professional ?? true
        },
        negotiationValue: Math.max(0, issue.negotiationValue || issue.estimatedCost?.mostLikely || 0),
        riskLevel: issue.riskLevel || 'medium',
        confidence: Math.max(0, Math.min(1, issue.confidence || 0.7)),
        sourceText: issue.sourceText || 'Analysis based on report content',
        reasoning: issue.reasoning || 'Identified through AI analysis of inspection report'
      }));

      const totalEstimatedCost = issues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
      const averageConfidence = issues.reduce((sum, issue) => sum + issue.confidence, 0) / Math.max(1, issues.length);

      return {
        success: true,
        issues,
        modelUsed: model,
        processingTime,
        confidence: averageConfidence,
        summary: {
          totalIssues: issues.length,
          totalEstimatedCost,
          averageConfidence
        }
      };

    } catch (error) {
      throw new Error(`Failed to parse Claude response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  }
}