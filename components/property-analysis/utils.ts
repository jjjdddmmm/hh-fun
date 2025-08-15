// Legacy utility functions - use centralized utilities instead
// This file will be deprecated in favor of centralized utilities

import type { Property, PropertyRecommendation } from '@/lib/types/property';
import { formatPrice as formatPriceUtil } from '@/lib/utils/formatting';
import { 
  getRecommendationColor as getRecommendationColorAnalysis,
  calculateScoreBreakdown as calculateScoreBreakdownAnalysis,
  calculateTotalScore as calculateTotalScoreAnalysis
} from '@/lib/utils/property-analysis';

// Re-export centralized utilities for backward compatibility
export const formatPrice = formatPriceUtil;
export const getRecommendationColor = getRecommendationColorAnalysis;
export const calculateScoreBreakdown = calculateScoreBreakdownAnalysis;
export const calculateTotalScore = calculateTotalScoreAnalysis;

// Legacy function for investment recommendation
export const getInvestmentRecommendation = (totalScore: number): PropertyRecommendation => {
  if (totalScore >= 65) return 'excellent';
  if (totalScore >= 55) return 'good';
  if (totalScore >= 45) return 'fair';
  if (totalScore >= 35) return 'investigate';
  return 'overpriced';
};

// Legacy function for score grade
export const getScoreGrade = (totalScore: number): string => {
  if (totalScore >= 65) return 'A';
  if (totalScore >= 55) return 'B';
  if (totalScore >= 45) return 'C';
  if (totalScore >= 35) return 'D';
  return 'F';
};