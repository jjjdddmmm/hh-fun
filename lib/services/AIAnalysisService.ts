import { PropertyAIAnalyzer, PropertyAnalysisResult } from '../ai-analysis';
import { ZillowPropertyData } from '../zillow-api';
import { apiCache } from '../cache';
import { aiRateLimiter } from '../rate-limiter';

export interface PropertyInsights {
  keyInsights: string[];
  redFlags: string[];
  investmentScore: number;
}

export class AIAnalysisService {
  private analyzer: PropertyAIAnalyzer;

  constructor() {
    this.analyzer = new PropertyAIAnalyzer();
  }

  async generatePropertyInsights(propertyData: ZillowPropertyData): Promise<PropertyInsights> {
    // Create cache key based on property data
    const cacheKey = `ai_insights_${propertyData.zpid}_${propertyData.price}_${propertyData.livingArea}`;
    const cachedInsights = apiCache.get<PropertyInsights>(cacheKey);
    
    if (cachedInsights) {
      return cachedInsights;
    }

    // Check rate limit
    if (!aiRateLimiter.isAllowed('ai_analysis')) {
      throw new Error('AI analysis rate limit exceeded. Please try again later.');
    }

    try {
      const insights = await this.analyzer.generateInsights(propertyData);
      
      // Cache AI insights for 1 hour
      apiCache.set(cacheKey, insights, 60 * 60 * 1000);
      
      return insights;
    } catch (error) {
      console.error('Failed to generate property insights:', error);
      
      // Return fallback insights on error
      return {
        investmentScore: 50,
        keyInsights: ['Analysis temporarily unavailable'],
        redFlags: ['Unable to complete full analysis']
      };
    }
  }

  async generateFullAnalysis(propertyData: ZillowPropertyData): Promise<PropertyAnalysisResult> {
    // Create cache key based on property data
    const cacheKey = `ai_analysis_${propertyData.zpid}_${propertyData.price}_${propertyData.livingArea}`;
    const cachedAnalysis = apiCache.get<PropertyAnalysisResult>(cacheKey);
    
    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    // Check rate limit
    if (!aiRateLimiter.isAllowed('ai_analysis')) {
      throw new Error('AI analysis rate limit exceeded. Please try again later.');
    }

    try {
      const analysis = await this.analyzer.analyzeProperty(propertyData);
      
      // Cache full analysis for 2 hours
      apiCache.set(cacheKey, analysis, 2 * 60 * 60 * 1000);
      
      return analysis;
    } catch (error) {
      console.error('Failed to generate full property analysis:', error);
      throw error;
    }
  }

  validateInsights(insights: PropertyInsights): boolean {
    return !!(
      insights.investmentScore !== undefined &&
      insights.investmentScore >= 0 &&
      insights.investmentScore <= 100 &&
      Array.isArray(insights.keyInsights) &&
      Array.isArray(insights.redFlags)
    );
  }
}

export function createAIAnalysisService(): AIAnalysisService {
  return new AIAnalysisService();
}