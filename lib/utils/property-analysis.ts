// Property analysis utility functions
import type { Property, PropertyAnalysis, ScoreBreakdown } from '@/lib/types/property';

/**
 * Gets the CSS classes for a property recommendation badge
 * @param recommendation - The property recommendation level
 * @returns CSS classes string for styling the badge
 */
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

/**
 * Calculates property-specific score breakdown for investment analysis
 * @param property - The property to analyze
 * @returns Score breakdown with market pricing, condition, and location scores
 */
export const calculateScoreBreakdown = (property: Property): ScoreBreakdown => {
  if (!property.data || !property.analysis) {
    return {
      marketPricing: { score: 10, maxScore: 20, description: 'Insufficient data' },
      propertyCondition: { score: 7, maxScore: 15, description: 'Analysis pending' },
      locationValue: { score: 10, maxScore: 20, description: 'Data unavailable' }
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
    }
  };
};

/**
 * Calculates the total investment score from score breakdown
 * @param scoreBreakdown - The score breakdown object
 * @returns Total score out of 100
 */
export const calculateTotalScore = (scoreBreakdown: ScoreBreakdown): number => {
  const totalScore = scoreBreakdown.marketPricing.score + 
                    scoreBreakdown.propertyCondition.score + 
                    scoreBreakdown.locationValue.score;
  const maxScore = scoreBreakdown.marketPricing.maxScore + 
                   scoreBreakdown.propertyCondition.maxScore + 
                   scoreBreakdown.locationValue.maxScore;
  
  return Math.round((totalScore / maxScore) * 100);
};