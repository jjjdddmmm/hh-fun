// Utility functions for Property Analysis
// Extracted from the massive 2,963-line analysis component

import type { Property, ScoreBreakdown, RecommendationType } from './types';

export const formatPrice = (price: number | null | undefined): string => {
  if (!price || price === 0) return '$0';
  
  // Always show full numbers with proper comma formatting
  return `$${price.toLocaleString()}`;
};

export const getRecommendationColor = (recommendation: string): string => {
  switch (recommendation) {
    case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
    case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'overpriced': return 'bg-red-100 text-red-800 border-red-200';
    case 'investigate': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Calculate property-specific score breakdown
export const calculateScoreBreakdown = (property: Property): ScoreBreakdown => {
  if (!property.data || !property.analysis) {
    return {
      marketPricing: { score: 10, maxScore: 20, description: 'Insufficient data' },
      propertyCondition: { score: 7, maxScore: 15, description: 'Analysis pending' },
      locationValue: { score: 10, maxScore: 20, description: 'Data unavailable' },
      cashFlowPotential: { score: 7, maxScore: 15, description: 'Needs analysis' }
    };
  }

  const { data, analysis } = property;
  
  // Market Pricing Score (0-20 points)
  let marketPricingScore = 10; // Base score
  let marketPricingDesc = 'Market positioning analysis';
  
  if (analysis.marketValue) {
    const priceDifference = (data.price - analysis.marketValue.estimated) / analysis.marketValue.estimated;
    if (priceDifference < -0.1) {
      marketPricingScore = 20; // Significantly underpriced
      marketPricingDesc = 'Excellent value - below market estimate';
    } else if (priceDifference < -0.05) {
      marketPricingScore = 18; // Moderately underpriced
      marketPricingDesc = 'Good value - competitively priced';
    } else if (priceDifference < 0.05) {
      marketPricingScore = 15; // Fair market price
      marketPricingDesc = 'Fair market pricing';
    } else if (priceDifference < 0.1) {
      marketPricingScore = 10; // Slightly overpriced
      marketPricingDesc = 'Slightly above market estimate';
    } else {
      marketPricingScore = 5; // Significantly overpriced
      marketPricingDesc = 'Above market pricing';
    }
  }
  
  // Property Condition Score (0-15 points)
  let propertyConditionScore = 7; // Base score
  let propertyConditionDesc = 'Standard condition for age';
  
  const propertyAge = new Date().getFullYear() - data.yearBuilt;
  if (propertyAge < 5) {
    propertyConditionScore = 15;
    propertyConditionDesc = 'Excellent - newly built';
  } else if (propertyAge < 15) {
    propertyConditionScore = 13;
    propertyConditionDesc = 'Very good - modern construction';
  } else if (propertyAge < 30) {
    propertyConditionScore = 10;
    propertyConditionDesc = 'Good condition for age';
  } else {
    propertyConditionScore = 7;
    propertyConditionDesc = 'Established property';
  }
  
  // Location Value Score (0-20 points)
  let locationValueScore = 10; // Base score
  let locationValueDesc = 'Standard neighborhood';
  
  // Use market analysis data if available
  if (analysis.marketAnalysis) {
    const demandLevel = analysis.marketAnalysis.demandLevel;
    const appreciation = analysis.marketAnalysis.appreciation;
    
    if (demandLevel === 'high' && appreciation === 'strong') {
      locationValueScore = 20;
      locationValueDesc = 'Excellent location fundamentals';
    } else if (demandLevel === 'high' || appreciation === 'strong') {
      locationValueScore = 16;
      locationValueDesc = 'Strong neighborhood fundamentals';
    } else if (demandLevel === 'medium' && appreciation === 'moderate') {
      locationValueScore = 13;
      locationValueDesc = 'Good location potential';
    } else {
      locationValueScore = 8;
      locationValueDesc = 'Average location metrics';
    }
  }
  
  // Cash Flow Potential Score (0-15 points)
  let cashFlowScore = 7; // Base score
  let cashFlowDesc = 'Standard rental potential';
  
  if (analysis.financialProjection && analysis.financialProjection.cashFlow !== undefined) {
    const cashFlow = analysis.financialProjection.cashFlow;
    if (cashFlow > 500) {
      cashFlowScore = 15;
      cashFlowDesc = 'Excellent cash flow potential';
    } else if (cashFlow > 200) {
      cashFlowScore = 12;
      cashFlowDesc = 'Good rental yield expected';
    } else if (cashFlow > 0) {
      cashFlowScore = 9;
      cashFlowDesc = 'Positive cash flow potential';
    } else if (cashFlow > -200) {
      cashFlowScore = 6;
      cashFlowDesc = 'Break-even to slight loss';
    } else {
      cashFlowScore = 3;
      cashFlowDesc = 'Negative cash flow expected';
    }
  }
  
  return {
    marketPricing: { 
      score: marketPricingScore, 
      maxScore: 20, 
      description: marketPricingDesc 
    },
    propertyCondition: { 
      score: propertyConditionScore, 
      maxScore: 15, 
      description: propertyConditionDesc 
    },
    locationValue: { 
      score: locationValueScore, 
      maxScore: 20, 
      description: locationValueDesc 
    },
    cashFlowPotential: { 
      score: cashFlowScore, 
      maxScore: 15, 
      description: cashFlowDesc 
    }
  };
};

export const calculateTotalScore = (scoreBreakdown: ScoreBreakdown): number => {
  return Object.values(scoreBreakdown).reduce((total, component) => total + component.score, 0);
};

export const getScoreGrade = (totalScore: number): string => {
  if (totalScore >= 65) return 'A';
  if (totalScore >= 55) return 'B';
  if (totalScore >= 45) return 'C';
  if (totalScore >= 35) return 'D';
  return 'F';
};

export const getInvestmentRecommendation = (totalScore: number): RecommendationType => {
  if (totalScore >= 65) return 'excellent';
  if (totalScore >= 55) return 'good';
  if (totalScore >= 45) return 'fair';
  if (totalScore >= 35) return 'investigate';
  return 'overpriced';
};