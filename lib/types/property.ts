// Property types for the analysis system
export interface PropertyData {
  address: string;
  price: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  daysOnMarket: number;
  pricePerSqft: number;
  description: string;
  images?: string[];
}

export interface MarketValue {
  low: number;
  high: number;
  estimated: number;
  confidence: number;
}

export interface NegotiationStrategy {
  suggestedOffer: number;
  tactics: string[];
  leverage: string[];
}

export interface MarketAnalysis {
  pricePerSqftComparison: string;
  marketTrend: string;
  demandLevel: string;
  appreciation: string;
}

export interface PropertyAnalysis {
  marketValue: MarketValue;
  recommendation: 'excellent' | 'good' | 'fair' | 'overpriced' | 'investigate';
  keyInsights: string[];
  redFlags: string[];
  investmentScore: number;
  investmentGrade?: string;
  investmentRecommendation?: string;
  scoreBreakdown?: ScoreBreakdown;
  keyOpportunities?: string[];
  negotiationStrategy: NegotiationStrategy;
  marketAnalysis: MarketAnalysis;
  aiConfidence: number;
  analysis: string;
}

export interface ScoreBreakdown {
  marketPricing: {
    score: number;
    maxScore: number;
    description: string;
  };
  propertyCondition: {
    score: number;
    maxScore: number;
    description: string;
  };
  locationValue: {
    score: number;
    maxScore: number;
    description: string;
  };
}

export interface Property {
  id: string;
  mlsUrl: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: 'pending' | 'analyzed' | 'error';
  hasTimeline?: boolean;
  data?: PropertyData;
  analysis?: PropertyAnalysis;
}

export type PropertyStatus = Property['status'];
export type PropertyRecommendation = PropertyAnalysis['recommendation'];