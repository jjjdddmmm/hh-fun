// Types for Property Analysis System
// Extracted from the massive 2,963-line analysis component

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

export interface PropertyAnalysis {
  marketValue: { 
    low: number; 
    high: number; 
    estimated: number; 
    confidence: number 
  };
  recommendation: 'excellent' | 'good' | 'fair' | 'overpriced' | 'investigate';
  keyInsights: string[];
  redFlags: string[];
  investmentScore: number;
  
  // Enhanced BatchData + AI scoring fields
  investmentGrade?: string;
  investmentRecommendation?: string;
  scoreBreakdown?: ScoreBreakdown;
  keyOpportunities?: string[];
  
  negotiationStrategy: NegotiationStrategy;
  financialProjection: FinancialProjection;
  marketAnalysis: MarketAnalysis;
  aiConfidence: number;
  analysis: string;
}

export interface ScoreBreakdown {
  marketPricing: ScoreComponent;
  propertyCondition: ScoreComponent;
  locationValue: ScoreComponent;
  cashFlowPotential: ScoreComponent;
}

export interface ScoreComponent {
  score: number;
  maxScore: number;
  description: string;
}

export interface NegotiationStrategy {
  suggestedOffer: number;
  tactics: string[];
  leverage: string[];
}

export interface FinancialProjection {
  monthlyMortgage: number;
  downPayment: number;
  closingCosts: number;
  monthlyExpenses: number;
  cashFlow: number;
}

export interface MarketAnalysis {
  pricePerSqftComparison: string;
  marketTrend: string;
  demandLevel: string;
  appreciation: string;
}

export interface BuyerProfile {
  maxBudget: string;
  downPaymentAvailable: string;
  creditScore: string;
  firstTimeBuyer: boolean;
  investmentGoals: 'primary' | 'investment' | 'flip';
}

export interface WizardData {
  maxBudget: string;
  preferredPrice: string;
  downPayment: string;
  closingTimeline: string;
  moveInFlexibility: string;
  contingencies: {
    inspection: boolean;
    financing: boolean;
    appraisal: boolean;
    saleOfHome: boolean;
  };
}

export interface ModalState {
  selectedProperty: Property | null;
  showInvestmentScore: boolean;
  activeOfferTab: 'strategy' | 'wizard' | 'education';
  activeModalTab: 'offers';
  showDealMaker: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  loadingComps: string | null;
  generatingStrategy: boolean;
  creatingTimeline: string | null;
  dealMakerLoading: boolean;
}

export type RecommendationType = 'excellent' | 'good' | 'fair' | 'overpriced' | 'investigate';