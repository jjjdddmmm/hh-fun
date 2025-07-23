import { createAIAnalysisService } from './AIAnalysisService';

/**
 * Enhanced Investment Scoring Service
 * Uses BatchData intelligence + AI analysis for accurate investment scoring
 */

export interface InvestmentScoreBreakdown {
  dealPotential: {
    score: number;
    maxScore: number;
    description: string;
    factors: string[];
  };
  marketTiming: {
    score: number;
    maxScore: number;
    description: string;
    factors: string[];
  };
  ownerMotivation: {
    score: number;
    maxScore: number;
    description: string;
    factors: string[];
  };
  financialOpportunity: {
    score: number;
    maxScore: number;
    description: string;
    factors: string[];
  };
  riskAssessment: {
    score: number;
    maxScore: number;
    description: string;
    factors: string[];
  };
}

export interface EnhancedInvestmentScore {
  totalScore: number;
  maxScore: number;
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'CAUTION' | 'AVOID';
  confidence: number;
  breakdown: InvestmentScoreBreakdown;
  aiInsights: string[];
  keyOpportunities: string[];
  redFlags: string[];
}

export class EnhancedInvestmentScoringService {
  private aiService = createAIAnalysisService();

  /**
   * Calculate comprehensive investment score using BatchData intelligence + AI
   */
  async calculateEnhancedScore(property: any, batchDataIntelligence?: any): Promise<EnhancedInvestmentScore> {
    console.log('🔍 Calculating enhanced investment score with BatchData intelligence...');
    
    // Extract BatchData intelligence from property or separate parameter
    const intelligence = batchDataIntelligence || this.extractBatchDataIntelligence(property);
    
    // Calculate component scores
    const dealPotential = this.calculateDealPotential(property, intelligence);
    const marketTiming = this.calculateMarketTiming(property, intelligence);
    const ownerMotivation = this.calculateOwnerMotivation(property, intelligence);
    const financialOpportunity = this.calculateFinancialOpportunity(property, intelligence);
    const riskAssessment = this.calculateRiskAssessment(property, intelligence);

    // Total score and grading
    const totalScore = dealPotential.score + marketTiming.score + ownerMotivation.score + 
                      financialOpportunity.score + riskAssessment.score;
    const maxScore = dealPotential.maxScore + marketTiming.maxScore + ownerMotivation.maxScore +
                    financialOpportunity.maxScore + riskAssessment.maxScore;
    
    const percentage = (totalScore / maxScore) * 100;
    const grade = this.calculateGrade(percentage);
    const recommendation = this.getRecommendation(percentage, intelligence);
    
    // Generate AI insights
    const aiAnalysis = await this.generateAIInsights(property, intelligence, percentage);
    
    console.log(`💎 Investment Score: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%) - Grade: ${grade}`);
    
    return {
      totalScore,
      maxScore,
      grade,
      recommendation,
      confidence: aiAnalysis.confidence,
      breakdown: {
        dealPotential,
        marketTiming,
        ownerMotivation,
        financialOpportunity,
        riskAssessment
      },
      aiInsights: aiAnalysis.insights,
      keyOpportunities: aiAnalysis.opportunities,
      redFlags: aiAnalysis.redFlags
    };
  }

  /**
   * Deal Potential Score (0-25 points)
   * Analyzes price vs value, equity position, and financial opportunity
   */
  private calculateDealPotential(property: any, intelligence: any): InvestmentScoreBreakdown['dealPotential'] {
    let score = 5; // Base score
    const factors: string[] = [];
    let description = 'Standard market deal';

    // Price vs Estimated Value Analysis
    if (property.data?.price && intelligence.estimatedValue) {
      const valueRatio = property.data.price / intelligence.estimatedValue;
      if (valueRatio < 0.85) {
        score += 10;
        factors.push('Significantly underpriced vs AVM');
        description = 'Excellent value opportunity';
      } else if (valueRatio < 0.95) {
        score += 7;
        factors.push('Good value vs market estimate');
        description = 'Good deal potential';
      } else if (valueRatio > 1.1) {
        score -= 3;
        factors.push('Overpriced vs market estimate');
        description = 'Above market pricing';
      }
    }

    // High Equity Properties (motivated sellers)
    if (intelligence.highEquity) {
      score += 5;
      factors.push('High equity position indicates flexibility');
    }

    // Distressed/Motivated Sale Signals
    if (intelligence.distressedProperty) {
      score += 8;
      factors.push('Distressed property - potential discount');
    }
    
    if (intelligence.foreclosureStatus && intelligence.foreclosureStatus !== 'none') {
      score += 6;
      factors.push(`Foreclosure status: ${intelligence.foreclosureStatus}`);
    }

    // Days on Market (stale listings = negotiation power)
    if (property.data?.daysOnMarket) {
      if (property.data.daysOnMarket > 90) {
        score += 4;
        factors.push('Long market time indicates motivated seller');
      } else if (property.data.daysOnMarket > 60) {
        score += 2;
        factors.push('Extended market time');
      }
    }

    return {
      score: Math.min(score, 25),
      maxScore: 25,
      description,
      factors
    };
  }

  /**
   * Market Timing Score (0-20 points)
   * Analyzes market conditions and timing
   */
  private calculateMarketTiming(property: any, intelligence: any): InvestmentScoreBreakdown['marketTiming'] {
    let score = 8; // Base score
    const factors: string[] = [];
    let description = 'Neutral market timing';

    // Market Trend Analysis
    if (intelligence.marketTrend === 'hot') {
      score += 7;
      factors.push('Hot market - strong appreciation potential');
      description = 'Excellent market timing';
    } else if (intelligence.marketTrend === 'warm') {
      score += 4;
      factors.push('Warm market conditions');
      description = 'Good market timing';
    } else if (intelligence.marketTrend === 'cold') {
      score += 2;
      factors.push('Buyer\'s market conditions');
    } else if (intelligence.marketTrend === 'declining') {
      score -= 2;
      factors.push('Declining market trend');
      description = 'Challenging market timing';
    }

    // Demand Level
    if (intelligence.demandLevel === 'high') {
      score += 5;
      factors.push('High buyer demand in area');
    } else if (intelligence.demandLevel === 'medium') {
      score += 2;
      factors.push('Moderate buyer demand');
    }

    // Recently Sold Activity
    if (intelligence.recentlySold) {
      score += 3;
      factors.push('Active recent sales activity');
    }

    return {
      score: Math.min(score, 20),
      maxScore: 20,
      description,
      factors
    };
  }

  /**
   * Owner Motivation Score (0-20 points)
   * Analyzes owner circumstances for negotiation leverage
   */
  private calculateOwnerMotivation(property: any, intelligence: any): InvestmentScoreBreakdown['ownerMotivation'] {
    let score = 5; // Base score
    const factors: string[] = [];
    let description = 'Standard owner motivation';

    // Absentee Owner (often more flexible)
    if (intelligence.absenteeOwner) {
      score += 6;
      factors.push('Absentee owner - potentially motivated');
      description = 'High owner motivation signals';
    }

    // Ownership Length (long ownership often means motivated)
    if (intelligence.ownershipLength) {
      if (intelligence.ownershipLength >= 10) {
        score += 5;
        factors.push(`${intelligence.ownershipLength} years owned - lifecycle change`);
      } else if (intelligence.ownershipLength >= 5) {
        score += 3;
        factors.push(`${intelligence.ownershipLength} years owned`);
      }
    }

    // Free and Clear (no mortgage pressure but flexible)
    if (intelligence.freeAndClear) {
      score += 4;
      factors.push('Property owned free and clear');
    }

    // Corporate/Trust Ownership (business decisions)
    if (intelligence.corporateOwned || intelligence.trustOwned) {
      score += 3;
      factors.push('Corporate/trust ownership');
    }

    // Cash Buyer History (understands quick deals)
    if (intelligence.cashBuyer) {
      score += 2;
      factors.push('Previous cash buyer experience');
    }

    return {
      score: Math.min(score, 20),
      maxScore: 20,
      description,
      factors
    };
  }

  /**
   * Financial Opportunity Score (0-20 points)
   * Analyzes rental potential, appreciation, and ROI
   */
  private calculateFinancialOpportunity(property: any, intelligence: any): InvestmentScoreBreakdown['financialOpportunity'] {
    let score = 8; // Base score
    const factors: string[] = [];
    let description = 'Standard investment returns';

    // Rental Yield Analysis
    if (intelligence.rentToValueRatio) {
      if (intelligence.rentToValueRatio >= 0.012) { // 1.2%+ monthly
        score += 8;
        factors.push('Excellent rent-to-price ratio (1.2%+ rule)');
        description = 'Outstanding cash flow potential';
      } else if (intelligence.rentToValueRatio >= 0.01) { // 1%+ monthly
        score += 6;
        factors.push('Good rent-to-price ratio (1%+ rule)');
        description = 'Strong cash flow potential';
      } else if (intelligence.rentToValueRatio >= 0.008) { // 0.8%+ monthly
        score += 3;
        factors.push('Moderate rental yield');
      } else {
        score -= 1;
        factors.push('Below average rental yield');
      }
    }

    // Cap Rate Analysis
    if (intelligence.capRate) {
      if (intelligence.capRate >= 8) {
        score += 6;
        factors.push(`High cap rate: ${intelligence.capRate.toFixed(1)}%`);
      } else if (intelligence.capRate >= 6) {
        score += 4;
        factors.push(`Good cap rate: ${intelligence.capRate.toFixed(1)}%`);
      } else if (intelligence.capRate >= 4) {
        score += 2;
        factors.push(`Moderate cap rate: ${intelligence.capRate.toFixed(1)}%`);
      }
    }

    // Property Features (add rental value)
    if (intelligence.pool) {
      score += 2;
      factors.push('Pool adds rental premium');
    }
    if (intelligence.garageParkingSpaces >= 2) {
      score += 1;
      factors.push('Multiple parking spaces');
    }

    return {
      score: Math.min(score, 20),
      maxScore: 20,
      description,
      factors
    };
  }

  /**
   * Risk Assessment Score (0-15 points, higher is lower risk)
   * Analyzes potential risks and red flags
   */
  private calculateRiskAssessment(property: any, intelligence: any): InvestmentScoreBreakdown['riskAssessment'] {
    let score = 12; // Start high, deduct for risks
    const factors: string[] = [];
    let description = 'Moderate risk profile';

    // Low risk factors (add points)
    if (intelligence.ownerOccupied) {
      score += 2;
      factors.push('Owner-occupied indicates good condition');
      description = 'Lower risk investment';
    }

    if (property.data?.yearBuilt && (new Date().getFullYear() - property.data.yearBuilt) < 15) {
      score += 1;
      factors.push('Newer construction reduces maintenance risk');
    }

    // Risk factors (deduct points)
    if (intelligence.vacant) {
      score -= 3;
      factors.push('Vacant property - condition unknown');
      description = 'Higher risk - requires inspection';
    }

    if (intelligence.taxDefault) {
      score -= 4;
      factors.push('Tax delinquency - legal risks');
      description = 'High risk - tax issues';
    }

    if (intelligence.fixAndFlipPotential) {
      score -= 2;
      factors.push('Property needs renovation');
    }

    // Market risk
    if (intelligence.demandLevel === 'low') {
      score -= 1;
      factors.push('Low market demand');
    }

    return {
      score: Math.max(score, 0),
      maxScore: 15,
      description,
      factors
    };
  }

  /**
   * Generate AI insights based on all available data
   */
  private async generateAIInsights(property: any, intelligence: any, scorePercentage: number): Promise<{
    confidence: number;
    insights: string[];
    opportunities: string[];
    redFlags: string[];
  }> {
    try {
      // Create comprehensive property profile for AI analysis
      const propertyProfile = {
        basicInfo: {
          address: property.data?.address,
          price: property.data?.price,
          bedrooms: property.data?.bedrooms,
          bathrooms: property.data?.bathrooms,
          squareFootage: property.data?.sqft,
          yearBuilt: property.data?.yearBuilt
        },
        batchDataIntelligence: intelligence,
        calculatedScore: scorePercentage
      };

      const aiPrompt = `
Analyze this investment property using the comprehensive data provided. Score: ${scorePercentage.toFixed(1)}%

Property: ${JSON.stringify(propertyProfile, null, 2)}

Provide investment analysis in JSON format:
{
  "confidence": number (0-100),
  "insights": ["key insight 1", "key insight 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...], 
  "redFlags": ["red flag 1", "red flag 2", ...]
}

Focus on:
- Investment potential based on BatchData intelligence
- Market timing and owner motivation factors
- Financial opportunity and risk assessment
- Specific actionable insights for this property
- Deal negotiation leverage points
`;

      const aiAnalysis = await this.aiService.generatePropertyInsights(propertyProfile as any);

      return {
        confidence: 85, // Default confidence since PropertyInsights doesn't have confidence field
        insights: aiAnalysis.keyInsights || ['Investment analysis in progress...'],
        opportunities: ['Detailed AI analysis unavailable - using BatchData scoring'], // PropertyInsights doesn't have opportunities field
        redFlags: aiAnalysis.redFlags || []
      };

    } catch (error) {
      console.error('Error generating AI insights:', error);
      return {
        confidence: 70,
        insights: ['Analysis based on BatchData intelligence and market factors'],
        opportunities: ['Detailed AI analysis unavailable - using BatchData scoring'],
        redFlags: []
      };
    }
  }

  /**
   * Extract BatchData intelligence from property object
   */
  private extractBatchDataIntelligence(property: any): any {
    // Extract from various possible property structures
    const intelligence = {
      // Financial Intelligence
      estimatedValue: property.estimatedValue || property.valuation?.estimatedValue,
      lastSalePrice: property.lastSalePrice || property.intel?.lastSoldPrice,
      equityPercent: property.equityPercent || property.valuation?.equityPercent,
      mortgageBalance: property.mortgageBalance || property.openLien?.totalOpenLienBalance,
      
      // Market Intelligence
      marketTrend: property.marketTrend,
      demandLevel: property.demandLevel,
      daysOnMarket: property.daysOnMarket,
      
      // Owner Intelligence
      ownerOccupied: property.ownerOccupied || property.quickLists?.ownerOccupied,
      absenteeOwner: property.absenteeOwner || property.quickLists?.absenteeOwner,
      ownershipLength: property.ownershipLength,
      
      // Investment Signals
      highEquity: property.highEquity || property.quickLists?.highEquity,
      cashBuyer: property.cashBuyer || property.quickLists?.cashBuyer,
      distressedProperty: property.distressedProperty || property.quickLists?.distressedProperty,
      foreclosureStatus: property.foreclosureStatus,
      freeAndClear: property.quickLists?.freeAndClear,
      
      // Property Features
      pool: property.buildingFeatures?.pool || property.building?.pool,
      garageParkingSpaces: property.buildingFeatures?.garageParkingSpaces || property.building?.garageParkingSpaceCount,
      
      // Rental Analysis
      rentToValueRatio: property.rentToValueRatio,
      capRate: property.capRate,
      
      // Risk Factors
      vacant: property.quickLists?.vacant,
      taxDefault: property.quickLists?.taxDefault,
      fixAndFlipPotential: property.fixAndFlipPotential || property.quickLists?.fixAndFlip,
      
      // Corporate/Trust
      corporateOwned: property.quickLists?.corporateOwned,
      trustOwned: property.quickLists?.trustOwned,
      
      // Market Activity
      recentlySold: property.quickLists?.recentlySold
    };

    console.log('📊 Extracted BatchData intelligence for scoring:', intelligence);
    return intelligence;
  }

  /**
   * Calculate letter grade from percentage
   */
  private calculateGrade(percentage: number): EnhancedInvestmentScore['grade'] {
    if (percentage >= 95) return 'A+';
    if (percentage >= 90) return 'A';
    if (percentage >= 85) return 'A-';
    if (percentage >= 80) return 'B+';
    if (percentage >= 75) return 'B';
    if (percentage >= 70) return 'B-';
    if (percentage >= 65) return 'C+';
    if (percentage >= 60) return 'C';
    if (percentage >= 55) return 'C-';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  /**
   * Get investment recommendation based on score and intelligence
   */
  private getRecommendation(percentage: number, intelligence: any): EnhancedInvestmentScore['recommendation'] {
    // Adjust recommendation based on special circumstances
    if (intelligence.distressedProperty || intelligence.foreclosureStatus !== 'none') {
      if (percentage >= 75) return 'STRONG BUY';
      if (percentage >= 65) return 'BUY';
      return 'CAUTION';
    }
    
    if (percentage >= 85) return 'STRONG BUY';
    if (percentage >= 75) return 'BUY';
    if (percentage >= 60) return 'HOLD';
    if (percentage >= 45) return 'CAUTION';
    return 'AVOID';
  }
}

// Factory function
export function createEnhancedInvestmentScoringService(): EnhancedInvestmentScoringService {
  return new EnhancedInvestmentScoringService();
}