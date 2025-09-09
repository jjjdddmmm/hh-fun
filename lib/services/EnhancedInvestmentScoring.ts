import { createAIAnalysisService } from './AIAnalysisService';

import { logger } from "@/lib/utils/logger";

// Rent-to-value ratio constants for different property price ranges
const RENT_RATIOS = {
  DEFAULT: 0.008,          // 0.8% monthly rent ratio
  AFFORDABLE: 0.012,       // 1.2% for properties under $300k
  MODERATE: 0.010,         // 1.0% for properties $300k-$500k  
  EXPENSIVE: 0.007,        // 0.7% for properties over $500k
  PRICE_THRESHOLDS: {
    AFFORDABLE: 300000,
    MODERATE: 500000
  }
};

// Days on market thresholds for different market conditions
const DAYS_ON_MARKET = {
  FRESH_LISTING: 7,        // Very new listing, high competition
  RECENT: 14,              // Recently listed
  STANDARD: 30,            // Normal market time
  EXTENDED: 60,            // Seller motivation building
  STALE: 90,               // Strong negotiation position
  VERY_STALE: 120,         // Highly motivated seller
  DEFAULT: 30              // Default assumption
};
/**
 * Enhanced Investment Scoring Service
 * Uses BatchData intelligence + AI analysis for accurate investment scoring
 */

// Type definition for property data used in scoring calculations
interface PropertyData {
  price?: number;
  address?: string;
  sqft?: number;
  livingArea?: number;
  yearBuilt?: number;
  daysOnMarket?: number;
  bedrooms?: number;
  bathrooms?: number;
  pricePerSqft?: number;
  description?: string;
  images?: string[];
}

// Type definition for property with nested data
interface Property {
  data?: PropertyData;
  price?: number;
  livingArea?: number;
  yearBuilt?: number;
  daysOnMarket?: number;
  mortgageBalance?: number;
  estimatedValue?: number;
  
  // Additional BatchData properties
  zestimate?: number;
  lastSalePrice?: number;
  intel?: { lastSoldPrice?: number };
  equityPercent?: number;
  openLien?: { totalOpenLienBalance?: number };
  marketTrend?: string;
  demandLevel?: string;
  ownerOccupied?: boolean;
  absenteeOwner?: boolean;
  ownershipLength?: number;
  highEquity?: boolean;
  cashBuyer?: boolean;
  distressedProperty?: boolean;
  foreclosureStatus?: string;
  buildingFeatures?: { pool?: boolean; garageParkingSpaces?: number };
  building?: { pool?: boolean; garageParkingSpaceCount?: number };
  features?: { pool?: boolean; garage?: boolean };
  rentToValueRatio?: number;
  capRate?: number;
  fixAndFlipPotential?: boolean;
  
  valuation?: {
    estimatedValue?: number;
    equityPercent?: number;
  };
  batchDataValuation?: {
    amount?: number;
  };
  quickLists?: {
    ownerOccupied?: boolean;
    absenteeOwner?: boolean;
    highEquity?: boolean;
    cashBuyer?: boolean;
    distressedProperty?: boolean;
    freeAndClear?: boolean;
    recentlySold?: boolean;
    vacant?: boolean;
    taxDefault?: boolean;
    fixAndFlip?: boolean;
    corporateOwned?: boolean;
    trustOwned?: boolean;
  };
}

// Type definition for BatchData intelligence used in scoring calculations
interface BatchDataIntelligence {
  // Financial Intelligence
  estimatedValue?: number;
  batchDataValuation?: { amount?: number };
  zestimate?: number;
  lastSalePrice?: number;
  equityPercent?: number;
  mortgageBalance?: number;
  
  // Market Intelligence
  marketTrend?: string;
  demandLevel?: string;
  daysOnMarket?: number;
  
  // Owner Intelligence
  ownerOccupied?: boolean;
  absenteeOwner?: boolean;
  ownershipLength?: number;
  
  // Investment Signals
  highEquity?: boolean;
  cashBuyer?: boolean;
  distressedProperty?: boolean;
  foreclosureStatus?: string;
  freeAndClear?: boolean;
  
  // Property Features
  pool?: boolean;
  garageParkingSpaces?: number;
  
  // Rental Analysis
  rentToValueRatio?: number;
  capRate?: number;
  
  // Risk Factors
  vacant?: boolean;
  taxDefault?: boolean;
  fixAndFlipPotential?: boolean;
  
  // Corporate/Trust
  corporateOwned?: boolean;
  trustOwned?: boolean;
  
  // Market Activity
  recentlySold?: boolean;
}

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
  async calculateEnhancedScore(property: Property, batchDataIntelligence?: BatchDataIntelligence): Promise<EnhancedInvestmentScore> {
    logger.debug('🔍 Calculating enhanced investment score with BatchData intelligence...');
    
    // Extract BatchData intelligence from property or separate parameter
    const intelligence = batchDataIntelligence || this.extractBatchDataIntelligence(property);
    
    // Calculate component scores
    const dealPotential = this.calculateDealPotential(property, intelligence);
    const marketTiming = this.calculateMarketTiming(intelligence);
    const ownerMotivation = this.calculateOwnerMotivation(intelligence);
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
    
    logger.debug(`💎 Investment Score: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%) - Grade: ${grade}`);
    logger.debug('🔢 Score Breakdown Components:', {
      dealPotential: `${dealPotential.score}/${dealPotential.maxScore} - ${dealPotential.description}`,
      marketTiming: `${marketTiming.score}/${marketTiming.maxScore} - ${marketTiming.description}`,
      ownerMotivation: `${ownerMotivation.score}/${ownerMotivation.maxScore} - ${ownerMotivation.description}`,
      financialOpportunity: `${financialOpportunity.score}/${financialOpportunity.maxScore}`,
      riskAssessment: `${riskAssessment.score}/${riskAssessment.maxScore}`
    });
    
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
  private calculateDealPotential(property: Property, intelligence: BatchDataIntelligence): InvestmentScoreBreakdown['dealPotential'] {
    let score = 0; // Start from 0 for more dynamic scoring
    const factors: string[] = [];
    let description = 'Deal evaluation in progress';

    const price = property.data?.price || property.price || 0;
    const estimatedValue = intelligence.estimatedValue || intelligence.batchDataValuation?.amount || price;
    const daysOnMarket = intelligence.daysOnMarket || DAYS_ON_MARKET.DEFAULT;

    // Price vs Estimated Value Analysis (0-12 points)
    if (price > 0 && estimatedValue > 0) {
      const valueRatio = price / estimatedValue;
      const discount = ((estimatedValue - price) / estimatedValue) * 100;
      
      if (valueRatio < 0.80) {
        score += 12;
        factors.push(`Exceptional value - ${discount.toFixed(0)}% below estimated value`);
        description = 'Outstanding investment opportunity';
      } else if (valueRatio < 0.90) {
        score += 10;
        factors.push(`Great deal - ${discount.toFixed(0)}% below market estimate`);
        description = 'Excellent value opportunity';
      } else if (valueRatio < 0.95) {
        score += 7;
        factors.push(`Good value - ${discount.toFixed(0)}% below estimate`);
        description = 'Good deal potential';
      } else if (valueRatio < 1.05) {
        score += 4;
        factors.push('Fair market pricing');
        description = 'Market-rate deal';
      } else if (valueRatio < 1.15) {
        score += 1;
        factors.push(`${(discount * -1).toFixed(0)}% above estimated value`);
        description = 'Above market pricing';
      } else {
        score += 0;
        factors.push(`Significantly overpriced - ${(discount * -1).toFixed(0)}% premium`);
        description = 'Overpriced property';
      }
    }

    // Market Timing Advantage (0-6 points)
    if (daysOnMarket > DAYS_ON_MARKET.VERY_STALE) {
      score += 6;
      factors.push(`${daysOnMarket} days on market - highly motivated seller`);
      if (description === 'Deal evaluation in progress') description = 'Strong negotiation position';
    } else if (daysOnMarket > DAYS_ON_MARKET.EXTENDED) {
      score += 4;
      factors.push(`${daysOnMarket} days on market - seller motivation building`);
    } else if (daysOnMarket > DAYS_ON_MARKET.STANDARD) {
      score += 2;
      factors.push(`${daysOnMarket} days on market - standard timeline`);
    } else if (daysOnMarket < DAYS_ON_MARKET.FRESH_LISTING) {
      score += 1;
      factors.push('Fresh listing - competitive market');
    }

    // Equity & Financial Leverage (0-7 points)
    if (intelligence.highEquity) {
      score += 4;
      factors.push(`High equity (${intelligence.equityPercent ? intelligence.equityPercent.toFixed(0) : '60+'}%) - flexible seller`);
    }
    
    if (intelligence.freeAndClear) {
      score += 3;
      factors.push('Property owned free and clear - maximum flexibility');
    } else if (intelligence.equityPercent && intelligence.equityPercent > 75) {
      score += 2;
      factors.push('Very high equity position');
    }

    // Distress Signals (Bonus points for motivated sellers)
    if (intelligence.distressedProperty) {
      score += 5;
      factors.push('Distressed property - significant discount potential');
      description = intelligence.foreclosureStatus !== 'none' ? 'High-opportunity distressed deal' : 'Motivated seller situation';
    }
    
    if (intelligence.foreclosureStatus && intelligence.foreclosureStatus !== 'none') {
      score += 4;
      factors.push(`Foreclosure status: ${intelligence.foreclosureStatus} - urgent sale`);
    }

    if (intelligence.absenteeOwner) {
      score += 2;
      factors.push('Absentee owner - potentially motivated to sell');
    }

    // Ensure minimum scoring based on property fundamentals
    if (score < 5 && factors.length === 0) {
      score = 5;
      factors.push('Basic deal evaluation - needs further analysis');
      description = 'Standard investment opportunity';
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
  private calculateMarketTiming(intelligence: BatchDataIntelligence): InvestmentScoreBreakdown['marketTiming'] {
    let score = 0; // Start from 0 for dynamic scoring
    const factors: string[] = [];
    let description = 'Market timing analysis';

    const daysOnMarket = intelligence.daysOnMarket || 30;
    const marketTrend = intelligence.marketTrend || 'warm';
    const demandLevel = intelligence.demandLevel || 'medium';

    // Market Trend Analysis (0-8 points)
    if (marketTrend === 'hot') {
      score += 8;
      factors.push('Hot market - rapid appreciation expected');
      description = 'Excellent timing for investment';
    } else if (marketTrend === 'warm') {
      score += 6;
      factors.push('Warm market conditions - steady growth');
      description = 'Good market timing';
    } else if (marketTrend === 'cold') {
      score += 3;
      factors.push('Buyer\'s market - negotiation advantages');
      description = 'Favorable buyer conditions';
    } else if (marketTrend === 'declining') {
      score += 1;
      factors.push('Declining trend - proceed with caution');
      description = 'Challenging market conditions';
    }

    // Demand Level Analysis (0-6 points)
    if (demandLevel === 'high') {
      score += 6;
      factors.push('High buyer demand - strong competition');
      if (daysOnMarket < 14) {
        factors.push('Properties selling quickly in area');
      }
    } else if (demandLevel === 'medium') {
      score += 4;
      factors.push('Moderate buyer demand - balanced market');
    } else {
      score += 2;
      factors.push('Lower buyer demand - more inventory available');
    }

    // Market Activity & Timing (0-6 points)
    if (daysOnMarket < DAYS_ON_MARKET.FRESH_LISTING) {
      score += 2;
      factors.push('Fresh listing in active market');
    } else if (daysOnMarket < DAYS_ON_MARKET.RECENT) {
      score += 4;
      factors.push('Recently listed - good timing to act');
    } else if (daysOnMarket < DAYS_ON_MARKET.STANDARD) {
      score += 5;
      factors.push('Standard market time - seller motivation building');
    } else if (daysOnMarket < DAYS_ON_MARKET.EXTENDED) {
      score += 6;
      factors.push('Extended time - strong buyer position');
    } else {
      score += 4;
      factors.push('Long market exposure - significant leverage');
    }

    // Recent Sales Activity
    if (intelligence.recentlySold) {
      score += 2;
      factors.push('Active recent sales in neighborhood');
    }

    // Seasonal/cyclical adjustments
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 2 && currentMonth <= 5) { // March-June
      score += 1;
      factors.push('Spring/summer market - peak buying season');
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
  private calculateOwnerMotivation(intelligence: BatchDataIntelligence): InvestmentScoreBreakdown['ownerMotivation'] {
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
   * Detect if property has rental income potential (ADU, multi-unit, etc.)
   */
  private hasRentalIncomeFeatures(property: Property, intelligence: BatchDataIntelligence): boolean {
    const propertyData = property.data || property;
    
    // Multi-family properties
    if (propertyData.propertyType?.toLowerCase().includes('multi') || 
        propertyData.propertyType?.toLowerCase().includes('duplex') ||
        propertyData.propertyType?.toLowerCase().includes('triplex') ||
        propertyData.propertyType?.toLowerCase().includes('fourplex')) {
      return true;
    }
    
    // ADU and rental unit indicators in description
    const description = propertyData.description?.toLowerCase() || '';
    const aduKeywords = [
      'adu', 'accessory dwelling', 'guest house', 'mother-in-law', 'mother in law',
      'separate unit', 'separate entrance', 'basement apartment', 'in-law suite',
      'casita', 'granny flat', 'detached unit', 'rental unit', 'income property',
      'duplex', 'triplex', 'fourplex', 'two family', 'multi-family'
    ];
    
    if (aduKeywords.some(keyword => description.includes(keyword))) {
      return true;
    }
    
    // Unusually high bedroom/bathroom count for single family (potential conversion)
    if (propertyData.propertyType?.toLowerCase().includes('single') && 
        propertyData.bedrooms && propertyData.bedrooms >= 5 && 
        propertyData.bathrooms && propertyData.bathrooms >= 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Financial Opportunity Score (0-20 points)
   * Primary residence focus unless rental income features detected
   */
  private calculateFinancialOpportunity(property: Property, intelligence: BatchDataIntelligence): InvestmentScoreBreakdown['financialOpportunity'] {
    let score = 10; // Base score for primary residence value
    const factors: string[] = [];
    let description = 'Strong primary residence value';
    
    const hasRentalFeatures = this.hasRentalIncomeFeatures(property, intelligence);
    
    if (hasRentalFeatures) {
      // Property has rental income potential - use investment analysis
      score = 8; // Reset to investment base
      description = 'Standard investment returns';
      
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
    } else {
      // Primary residence focus - emphasize livability and value retention
      const propertyData = property.data || property;
      
      // Appreciate factors that matter for primary residence
      if (propertyData.yearBuilt && propertyData.yearBuilt >= 2010) {
        score += 3;
        factors.push('Modern construction reduces maintenance needs');
      } else if (propertyData.yearBuilt && propertyData.yearBuilt >= 1990) {
        score += 1;
        factors.push('Updated systems likely');
      }
      
      // Good size for primary residence
      if (propertyData.livingArea && propertyData.livingArea >= 1800) {
        score += 2;
        factors.push('Spacious living area');
      } else if (propertyData.livingArea && propertyData.livingArea >= 1200) {
        score += 1;
        factors.push('Adequate living space');
      }
      
      // Value retention factors
      if (intelligence.estimatedValue && propertyData.price) {
        const valueGap = (intelligence.estimatedValue - propertyData.price) / propertyData.price;
        if (valueGap > 0.05) {
          score += 4;
          factors.push('Priced below estimated market value');
          description = 'Excellent value for primary residence';
        } else if (valueGap > 0) {
          score += 2;
          factors.push('Fair pricing vs market value');
        }
      }
    }

    // Cap Rate Analysis (only for rental properties)
    if (hasRentalFeatures && intelligence.capRate) {
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

    // Property Features 
    if (intelligence.pool) {
      if (hasRentalFeatures) {
        score += 2;
        factors.push('Pool adds rental premium');
      } else {
        score += 1;
        factors.push('Pool enhances lifestyle value');
      }
    }
    if (intelligence.garageParkingSpaces && intelligence.garageParkingSpaces >= 2) {
      score += 1;
      if (hasRentalFeatures) {
        factors.push('Multiple parking spaces add rental value');
      } else {
        factors.push('Ample parking for homeowner');
      }
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
  private calculateRiskAssessment(property: Property, intelligence: BatchDataIntelligence): InvestmentScoreBreakdown['riskAssessment'] {
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
  private async generateAIInsights(property: Property, intelligence: BatchDataIntelligence, scorePercentage: number): Promise<{
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
      
      // Debug what's being sent to AI
      logger.debug('🤖 AI Property Profile:', {
        hasAddress: !!propertyProfile.basicInfo.address,
        hasPrice: !!propertyProfile.basicInfo.price,
        hasSqft: !!propertyProfile.basicInfo.squareFootage,
        propertyKeys: property ? Object.keys(property) : [],
        dataKeys: property.data ? Object.keys(property.data) : [],
        basicInfo: propertyProfile.basicInfo
      });

      logger.debug('🤖 Calling AI analysis service...');
      
      // Convert property profile to ZillowPropertyData format expected by AI
      const zillowFormatData = {
        zpid: 'batch-data-property',
        address: propertyProfile.basicInfo.address,
        price: propertyProfile.basicInfo.price,
        livingArea: propertyProfile.basicInfo.squareFootage,
        yearBuilt: propertyProfile.basicInfo.yearBuilt,
        bedrooms: propertyProfile.basicInfo.bedrooms,
        bathrooms: propertyProfile.basicInfo.bathrooms,
        pricePerSqft: (propertyProfile.basicInfo.squareFootage && propertyProfile.basicInfo.price) ? 
          Math.round(propertyProfile.basicInfo.price / propertyProfile.basicInfo.squareFootage) : 0,
        daysOnZillow: intelligence.daysOnMarket || 0,
        zestimate: intelligence.zestimate ? {
          amount: intelligence.zestimate,
          valuationRange: {
            low: intelligence.zestimate * 0.95,
            high: intelligence.zestimate * 1.05
          }
        } : undefined,
        rentZestimate: (intelligence.rentToValueRatio && propertyProfile.basicInfo.price) ? 
          Math.round(propertyProfile.basicInfo.price * intelligence.rentToValueRatio / 12) : undefined
      };
      
      logger.debug('🔄 Converted to Zillow format:', {
        hasAddress: !!zillowFormatData.address,
        hasLivingArea: !!zillowFormatData.livingArea,
        hasDaysOnZillow: !!zillowFormatData.daysOnZillow,
        hasZestimate: !!zillowFormatData.zestimate
      });
      
      const aiAnalysis = await this.aiService.generatePropertyInsights(zillowFormatData as any);
      
      logger.debug('🤖 AI Analysis Result:', {
        hasKeyInsights: !!aiAnalysis.keyInsights,
        keyInsightsLength: aiAnalysis.keyInsights?.length || 0,
        firstInsight: aiAnalysis.keyInsights?.[0]?.substring(0, 50) + '...',
        investmentScore: aiAnalysis.investmentScore,
        redFlagsCount: aiAnalysis.redFlags?.length || 0
      });

      // Generate opportunities from keyInsights if not directly available
      const opportunities = this.extractOpportunitiesFromInsights(aiAnalysis.keyInsights, intelligence, property);

      return {
        confidence: 85, // Default confidence since PropertyInsights doesn't have confidence field
        insights: aiAnalysis.keyInsights || ['Investment analysis in progress...'],
        opportunities: opportunities,
        redFlags: aiAnalysis.redFlags || []
      };

    } catch (error) {
      logger.error('Error generating AI insights:', error);
      
      // Generate fallback insights from BatchData intelligence
      const fallbackInsights = this.generateFallbackInsights(intelligence, scorePercentage);
      const fallbackOpportunities = this.extractOpportunitiesFromInsights([], intelligence, property);
      const fallbackRedFlags = this.generateFallbackRedFlags(property, intelligence);
      
      return {
        confidence: 70,
        insights: fallbackInsights,
        opportunities: fallbackOpportunities,
        redFlags: fallbackRedFlags
      };
    }
  }

  /**
   * Extract BatchData intelligence from property object
   */
  private extractBatchDataIntelligence(property: Property): BatchDataIntelligence {
    // Extract from various possible property structures with more robust extraction
    const intelligence = {
      // Financial Intelligence
      estimatedValue: property.estimatedValue || property.valuation?.estimatedValue || property.batchDataValuation?.amount,
      batchDataValuation: property.batchDataValuation,
      zestimate: property.zestimate,
      lastSalePrice: property.lastSalePrice || property.intel?.lastSoldPrice,
      equityPercent: property.equityPercent || property.valuation?.equityPercent || this.calculateEquityPercent(property),
      mortgageBalance: property.mortgageBalance || property.openLien?.totalOpenLienBalance,
      
      // Market Intelligence - Use real property data
      marketTrend: property.marketTrend || this.inferMarketTrend(property),
      demandLevel: property.demandLevel || this.inferDemandLevel(property),
      daysOnMarket: property.daysOnMarket || property.data?.daysOnMarket || 0,
      
      // Owner Intelligence
      ownerOccupied: property.ownerOccupied ?? property.quickLists?.ownerOccupied ?? this.inferOwnerOccupied(property),
      absenteeOwner: property.absenteeOwner ?? property.quickLists?.absenteeOwner ?? false,
      ownershipLength: property.ownershipLength || this.estimateOwnershipLength(property),
      
      // Investment Signals
      highEquity: property.highEquity ?? property.quickLists?.highEquity ?? this.hasHighEquity(property),
      cashBuyer: property.cashBuyer ?? property.quickLists?.cashBuyer ?? false,
      distressedProperty: property.distressedProperty ?? property.quickLists?.distressedProperty ?? this.inferDistressed(property),
      foreclosureStatus: property.foreclosureStatus || 'none',
      freeAndClear: property.quickLists?.freeAndClear ?? this.inferFreeAndClear(property),
      
      // Property Features
      pool: property.buildingFeatures?.pool || property.building?.pool || property.features?.pool || false,
      garageParkingSpaces: property.buildingFeatures?.garageParkingSpaces || property.building?.garageParkingSpaceCount || (property.features?.garage ? 2 : 0),
      
      // Rental Analysis - Calculate if not provided
      rentToValueRatio: property.rentToValueRatio || this.estimateRentToValue(property),
      capRate: property.capRate || this.estimateCapRate(property),
      
      // Risk Factors
      vacant: property.quickLists?.vacant ?? this.inferVacant(property),
      taxDefault: property.quickLists?.taxDefault ?? false,
      fixAndFlipPotential: property.fixAndFlipPotential ?? property.quickLists?.fixAndFlip ?? this.inferFixAndFlip(property),
      
      // Corporate/Trust
      corporateOwned: property.quickLists?.corporateOwned ?? false,
      trustOwned: property.quickLists?.trustOwned ?? false,
      
      // Market Activity
      recentlySold: property.quickLists?.recentlySold ?? this.inferRecentlySold(property)
    };

    logger.debug('📊 Extracted BatchData intelligence for scoring:', {
      hasEstimatedValue: !!intelligence.estimatedValue,
      estimatedValue: intelligence.estimatedValue,
      marketTrend: intelligence.marketTrend,
      demandLevel: intelligence.demandLevel,
      daysOnMarket: intelligence.daysOnMarket,
      ownerOccupied: intelligence.ownerOccupied,
      absenteeOwner: intelligence.absenteeOwner,
      highEquity: intelligence.highEquity,
      equityPercent: intelligence.equityPercent,
      distressedProperty: intelligence.distressedProperty,
      rentToValueRatio: intelligence.rentToValueRatio,
      capRate: intelligence.capRate,
      vacant: intelligence.vacant,
      fixAndFlipPotential: intelligence.fixAndFlipPotential
    });
    return intelligence;
  }

  // Helper methods to infer intelligence from basic property data
  private calculateEquityPercent(property: Property): number {
    const price = property.data?.price || property.price || 0;
    const mortgage = property.mortgageBalance || 0;
    return price > 0 ? Math.max(0, (price - mortgage) / price * 100) : 50;
  }

  private inferMarketTrend(property: Property): string {
    const daysOnMarket = property.data?.daysOnMarket || property.daysOnMarket || 0;
    if (daysOnMarket < DAYS_ON_MARKET.RECENT) return 'hot';
    if (daysOnMarket < DAYS_ON_MARKET.STANDARD) return 'warm';
    if (daysOnMarket < DAYS_ON_MARKET.STALE) return 'cold';
    return 'declining';
  }

  private inferDemandLevel(property: Property): string {
    const daysOnMarket = property.data?.daysOnMarket || property.daysOnMarket || 0;
    if (daysOnMarket < DAYS_ON_MARKET.RECENT) return 'high';
    if (daysOnMarket < DAYS_ON_MARKET.EXTENDED) return 'medium';
    return 'low';
  }

  private inferOwnerOccupied(property: Property): boolean {
    // Heuristic: smaller homes more likely to be owner-occupied
    const sqft = property.data?.sqft || property.livingArea || 0;
    return sqft < 2500; // Default assumption
  }

  private estimateOwnershipLength(property: Property): number {
    const yearBuilt = property.data?.yearBuilt || property.yearBuilt || new Date().getFullYear() - 20;
    const currentYear = new Date().getFullYear();
    const propertyAge = currentYear - yearBuilt;
    // Estimate average ownership is 1/3 of property age, min 2 years
    return Math.max(2, Math.round(propertyAge / 3));
  }

  private hasHighEquity(property: Property): boolean {
    return this.calculateEquityPercent(property) > 60;
  }

  private inferDistressed(property: Property): boolean {
    const daysOnMarket = property.data?.daysOnMarket || property.daysOnMarket || 0;
    return daysOnMarket > 120; // Properties on market >4 months may be distressed
  }

  private inferFreeAndClear(property: Property): boolean {
    const mortgage = property.mortgageBalance || 0;
    return mortgage === 0;
  }

  private estimateRentToValue(property: Property): number {
    const price = property.data?.price || property.price || 0;
    
    // Basic rent estimation based on property characteristics
    let rentMultiplier = RENT_RATIOS.DEFAULT;
    
    // Higher rent ratios in certain areas or property types
    if (price < RENT_RATIOS.PRICE_THRESHOLDS.AFFORDABLE) {
      rentMultiplier = RENT_RATIOS.AFFORDABLE; // Affordable areas often have better ratios
    } else if (price < RENT_RATIOS.PRICE_THRESHOLDS.MODERATE) {
      rentMultiplier = RENT_RATIOS.MODERATE;
    } else {
      rentMultiplier = RENT_RATIOS.EXPENSIVE; // Expensive areas typically lower ratios
    }
    
    return rentMultiplier;
  }

  private estimateCapRate(property: Property): number {
    const rentRatio = this.estimateRentToValue(property);
    // Annual rent ratio minus estimated expenses (30-40%)
    return (rentRatio * 12 * 0.65) * 100; // Convert to percentage
  }

  private inferVacant(property: Property): boolean {
    const daysOnMarket = property.data?.daysOnMarket || property.daysOnMarket || 0;
    // Properties on market >60 days might be vacant
    return daysOnMarket > 60;
  }

  private inferFixAndFlip(property: Property): boolean {
    const yearBuilt = property.data?.yearBuilt || property.yearBuilt || new Date().getFullYear();
    const propertyAge = new Date().getFullYear() - yearBuilt;
    const daysOnMarket = property.data?.daysOnMarket || property.daysOnMarket || 0;
    
    // Older properties on market longer may need renovation
    return propertyAge > 30 && daysOnMarket > 45;
  }

  private inferRecentlySold(property: Property): boolean {
    const daysOnMarket = property.data?.daysOnMarket || property.daysOnMarket || 0;
    return daysOnMarket < 30; // Recent activity in area
  }

  /**
   * Generate fallback insights when AI analysis fails
   */
  private generateFallbackInsights(intelligence: BatchDataIntelligence, scorePercentage: number): string[] {
    const insights: string[] = [];
    
    // Score-based insight
    if (scorePercentage >= 80) {
      insights.push('Strong investment opportunity based on comprehensive market data');
    } else if (scorePercentage >= 70) {
      insights.push('Good investment potential with favorable market conditions');
    } else if (scorePercentage >= 60) {
      insights.push('Moderate investment opportunity requiring careful evaluation');
    } else {
      insights.push('Limited investment potential based on current market analysis');
    }
    
    // Add specific insights based on BatchData
    if (intelligence.equityPercent && intelligence.equityPercent > 50) {
      insights.push(`High equity position (${Math.round(intelligence.equityPercent)}%) indicates negotiation flexibility`);
    }
    if (intelligence.daysOnMarket && intelligence.daysOnMarket > 60) {
      insights.push(`Extended market time (${intelligence.daysOnMarket} days) suggests seller motivation`);
    }
    if (intelligence.marketTrend === 'rising') {
      insights.push('Rising market trend supports strong appreciation potential');
    }
    
    return insights;
  }
  
  /**
   * Generate fallback red flags when AI analysis fails
   */
  private generateFallbackRedFlags(property: Property, intelligence: BatchDataIntelligence): string[] {
    const redFlags: string[] = [];
    
    if (intelligence.vacant) {
      redFlags.push('Property is currently vacant - investigate condition and marketability');
    }
    if (intelligence.taxDefault) {
      redFlags.push('Tax default status requires immediate attention');
    }
    if (intelligence.daysOnMarket && intelligence.daysOnMarket > 90) {
      redFlags.push('Extended time on market may indicate pricing or condition issues');
    }
    if (intelligence.marketTrend === 'falling') {
      redFlags.push('Declining market trend poses appreciation risk');
    }
    if (property.data?.price && intelligence.estimatedValue && property.data.price > intelligence.estimatedValue * 1.1) {
      redFlags.push('Listed price significantly above estimated value');
    }
    
    return redFlags;
  }

  /**
   * Extract opportunities from AI insights and BatchData intelligence
   */
  private extractOpportunitiesFromInsights(insights: string[], intelligence: BatchDataIntelligence, property?: Property): string[] {
    const opportunities: string[] = [];
    
    // Detect if property has rental features to determine messaging focus
    const hasRentalFeatures = property ? this.hasRentalIncomeFeatures(property, intelligence) : false;

    // Add BatchData-based opportunities with primary residence focus unless rental features detected
    if (intelligence.highEquity) {
      if (hasRentalFeatures) {
        opportunities.push('High equity position indicates seller flexibility for negotiation');
      } else {
        opportunities.push('High equity position indicates seller flexibility for negotiating a great primary residence purchase');
      }
    }
    if (intelligence.distressedProperty) {
      opportunities.push('Distressed property status may allow for below-market purchase');
    }
    if (intelligence.absenteeOwner) {
      if (hasRentalFeatures) {
        opportunities.push('Absentee owner may be motivated to sell quickly');
      } else {
        opportunities.push('Absentee owner may be motivated to sell quickly to a homeowner who will care for the property');
      }
    }
    if (intelligence.cashBuyer) {
      if (hasRentalFeatures) {
        opportunities.push('Previous cash purchase suggests potential for creative financing');
      } else {
        opportunities.push('Previous cash purchase indicates property quality and may suggest seller willingness to assist with financing');
      }
    }
    if (intelligence.demandLevel === 'high' && intelligence.marketTrend === 'rising') {
      opportunities.push('Strong market demand with rising prices supports investment');
    }
    if (intelligence.rentToValueRatio && intelligence.rentToValueRatio > 0.01) {
      opportunities.push('Strong rental income potential relative to property value');
    }

    // If we have actual AI insights, use the first few as opportunities
    if (insights && insights.length > 0 && !insights[0].includes('analysis unavailable')) {
      opportunities.push(...insights.slice(0, 2));
    }

    // Default opportunities if none found
    if (opportunities.length === 0) {
      opportunities.push('Property analysis complete - review detailed metrics for opportunities');
    }

    return opportunities;
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
  private getRecommendation(percentage: number, intelligence: BatchDataIntelligence): EnhancedInvestmentScore['recommendation'] {
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