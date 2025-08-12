/**
 * Negotiation Analysis Service
 * Transforms raw inspection issues into prioritized negotiation data
 * Clean, production-ready implementation with comprehensive analysis
 */

import { PrioritizedIssue } from "@/components/negotiation/IssuePrioritization";
import { ExecutiveSummary, NegotiationStrength } from "@/components/negotiation/ExecutiveDashboard";

interface RawInspectionIssue {
  id: string;
  category: string;
  severity: 'safety' | 'major' | 'minor' | 'cosmetic';
  urgency: 'immediate' | '1-2-years' | 'long-term';
  description: string;
  location: string;
  estimatedCost: {
    low: number;
    high: number;
    professional: boolean;
  };
  negotiationValue: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface MarketConditions {
  marketType: 'seller' | 'buyer' | 'balanced';
  seasonalFactor: number;
  localTrends: 'rising' | 'stable' | 'declining';
  competitionLevel: 'low' | 'medium' | 'high';
}

export class NegotiationAnalysisService {
  
  /**
   * Convert raw issues to prioritized negotiation issues
   */
  static prioritizeIssues(rawIssues: RawInspectionIssue[]): PrioritizedIssue[] {
    return rawIssues.map(issue => {
      const leverageScore = this.calculateLeverageScore(issue);
      const successRate = this.calculateSuccessRate(issue, leverageScore);
      const dropPriority = this.determineDropPriority(issue, leverageScore);
      
      return {
        id: issue.id,
        category: issue.category,
        severity: issue.severity,
        description: issue.description,
        location: issue.location,
        estimatedCost: {
          low: issue.estimatedCost?.low || 0,
          high: issue.estimatedCost?.high || 0,
          average: ((issue.estimatedCost?.low || 0) + (issue.estimatedCost?.high || 0)) / 2
        },
        negotiationValue: issue.negotiationValue,
        leverageScore,
        successRate,
        timelineImpact: this.assessTimelineImpact(issue),
        dropPriority,
        evidence: this.generateEvidence(issue),
        whatToSay: this.generateWhatToSay(issue),
        alternatives: this.generateAlternatives(issue)
      };
    }).sort((a, b) => b.leverageScore - a.leverageScore);
  }

  /**
   * Generate executive summary for negotiation dashboard
   */
  static generateExecutiveSummary(
    issues: PrioritizedIssue[],
    reportType: string,
    marketConditions: MarketConditions = {
      marketType: 'balanced',
      seasonalFactor: 1.0,
      localTrends: 'stable',
      competitionLevel: 'medium'
    }
  ): ExecutiveSummary {
    const totalNegotiationPower = issues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
    
    // Calculate breakdown
    const critical = issues.filter(issue => issue.severity === 'safety');
    const major = issues.filter(issue => issue.severity === 'major');
    const minor = issues.filter(issue => issue.severity === 'minor' || issue.severity === 'cosmetic');
    
    const criticalAmount = critical.reduce((sum, issue) => sum + issue.negotiationValue, 0);
    const majorAmount = major.reduce((sum, issue) => sum + issue.negotiationValue, 0);
    const minorAmount = minor.reduce((sum, issue) => sum + issue.negotiationValue, 0);
    
    const breakdown = {
      critical: {
        amount: criticalAmount,
        percentage: Math.round((criticalAmount / totalNegotiationPower) * 100)
      },
      major: {
        amount: majorAmount,
        percentage: Math.round((majorAmount / totalNegotiationPower) * 100)
      },
      minor: {
        amount: minorAmount,
        percentage: Math.round((minorAmount / totalNegotiationPower) * 100)
      }
    };

    // Calculate recommended ask (strategic markup)
    let recommendedAsk = totalNegotiationPower;
    
    // Market-based adjustments
    if (marketConditions.marketType === 'buyer') {
      recommendedAsk *= 1.15; // 15% premium in buyer's market
    } else if (marketConditions.marketType === 'seller') {
      recommendedAsk *= 0.95; // 5% discount in seller's market
    } else {
      recommendedAsk *= 1.1; // 10% standard negotiation buffer
    }
    
    // Seasonal adjustments
    recommendedAsk *= marketConditions.seasonalFactor;
    
    // Calculate success rate
    const avgLeverageScore = issues.reduce((sum, issue) => sum + issue.leverageScore, 0) / issues.length;
    let baseSuccessRate = 70;
    
    if (avgLeverageScore >= 8) baseSuccessRate = 85;
    else if (avgLeverageScore >= 6) baseSuccessRate = 75;
    else if (avgLeverageScore >= 4) baseSuccessRate = 65;
    else baseSuccessRate = 50;
    
    // Market condition adjustments
    if (marketConditions.marketType === 'buyer') baseSuccessRate += 10;
    else if (marketConditions.marketType === 'seller') baseSuccessRate -= 15;
    
    const successRate = Math.max(25, Math.min(95, baseSuccessRate));
    
    // Determine negotiation strength
    const negotiationStrength = this.assessNegotiationStrength(issues, marketConditions);
    
    return {
      totalNegotiationPower: Math.round(totalNegotiationPower),
      recommendedAsk: Math.round(recommendedAsk),
      successRate,
      negotiationStrength,
      breakdown,
      marketContext: marketConditions
    };
  }

  /**
   * Calculate leverage score (1-10 scale)
   */
  private static calculateLeverageScore(issue: RawInspectionIssue): number {
    let score = 5; // Base score
    
    // Severity weight (most important factor)
    switch (issue.severity) {
      case 'safety':
        score += 3;
        break;
      case 'major':
        score += 2;
        break;
      case 'minor':
        score += 1;
        break;
      case 'cosmetic':
        score += 0;
        break;
    }
    
    // Urgency weight
    switch (issue.urgency) {
      case 'immediate':
        score += 2;
        break;
      case '1-2-years':
        score += 1;
        break;
      case 'long-term':
        score += 0;
        break;
    }
    
    // Cost weight (higher costs = more leverage)
    const avgCost = ((issue.estimatedCost?.low || 0) + (issue.estimatedCost?.high || 0)) / 2;
    if (avgCost > 5000) score += 1;
    if (avgCost > 10000) score += 1;
    
    // Professional requirement adds credibility
    if (issue.estimatedCost?.professional) score += 1;
    
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Calculate success rate for individual issue
   */
  private static calculateSuccessRate(issue: RawInspectionIssue, leverageScore: number): number {
    let rate = leverageScore * 10; // Base rate from leverage
    
    // Adjust for specific factors
    if (issue.severity === 'safety') rate += 15;
    if (issue.urgency === 'immediate') rate += 10;
    if (issue.estimatedCost?.professional) rate += 5;
    
    return Math.max(20, Math.min(95, rate));
  }

  /**
   * Determine drop priority for negotiations
   */
  private static determineDropPriority(issue: RawInspectionIssue, leverageScore: number): 'never' | 'last' | 'first' {
    if (issue.severity === 'safety' || leverageScore >= 8) return 'never';
    if (issue.severity === 'major' || leverageScore >= 6) return 'last';
    return 'first';
  }

  /**
   * Assess timeline impact
   */
  private static assessTimelineImpact(issue: RawInspectionIssue): 'delays_closing' | 'no_impact' | 'optional' {
    if (issue.severity === 'safety' || issue.urgency === 'immediate') return 'delays_closing';
    if (issue.severity === 'major') return 'no_impact';
    return 'optional';
  }

  /**
   * Generate supporting evidence
   */
  private static generateEvidence(issue: RawInspectionIssue): string[] {
    const evidence: string[] = [];
    
    if (issue.severity === 'safety') {
      evidence.push('Safety code violations requiring immediate attention');
      evidence.push('Liability concerns for current and future occupancy');
    }
    
    if (issue.urgency === 'immediate') {
      evidence.push('Professional inspector marked as immediate priority');
    }
    
    if (issue.estimatedCost?.professional) {
      evidence.push('Requires licensed professional contractor');
    }
    
    const lowCost = issue.estimatedCost?.low || 0;
    const highCost = issue.estimatedCost?.high || 0;
    evidence.push(`Current market rates: $${lowCost.toLocaleString()} - $${highCost.toLocaleString()}`);
    
    if (issue.riskLevel === 'high') {
      evidence.push('High risk of additional damage if not addressed');
    }
    
    return evidence;
  }

  /**
   * Generate "what to say" script
   */
  private static generateWhatToSay(issue: RawInspectionIssue): string {
    const baseScript = `The ${issue.category.toLowerCase()} issue in ${issue.location} ${issue.description.toLowerCase()}.`;
    
    if (issue.severity === 'safety') {
      return `${baseScript} This is a safety concern that creates liability issues and must be addressed before occupancy per local building codes.`;
    }
    
    if (issue.urgency === 'immediate') {
      return `${baseScript} Our inspector marked this as requiring immediate attention, and current contractor availability supports the estimated repair cost.`;
    }
    
    if (issue.severity === 'major') {
      return `${baseScript} This affects a major building system and will become significantly more expensive if deferred due to current material and labor costs.`;
    }
    
    return `${baseScript} While not immediately critical, addressing this now prevents future complications and higher repair costs.`;
  }

  /**
   * Generate alternative approaches
   */
  private static generateAlternatives(issue: RawInspectionIssue): string[] {
    const alternatives: string[] = [];
    
    alternatives.push('Credit for full repair cost');
    
    if (issue.severity !== 'safety') {
      alternatives.push('Seller completes repair before closing');
      alternatives.push('Split cost 50/50');
    }
    
    if (issue.estimatedCost?.professional) {
      alternatives.push('Seller provides licensed contractor warranty');
    }
    
    if (issue.urgency !== 'immediate') {
      alternatives.push('Extended warranty coverage');
      alternatives.push('Price reduction instead of credit');
    }
    
    return alternatives;
  }

  /**
   * Assess overall negotiation strength
   */
  private static assessNegotiationStrength(
    issues: PrioritizedIssue[],
    marketConditions: MarketConditions
  ): NegotiationStrength {
    const safetyIssues = issues.filter(issue => issue.severity === 'safety');
    const highLeverageIssues = issues.filter(issue => issue.leverageScore >= 7);
    const avgLeverageScore = issues.reduce((sum, issue) => sum + issue.leverageScore, 0) / issues.length;
    
    let score = Math.round(avgLeverageScore * 10);
    let level: NegotiationStrength['level'] = 'MODERATE';
    const factors: string[] = [];
    
    // Positive factors
    if (safetyIssues.length > 0) {
      score += 15;
      factors.push(`${safetyIssues.length} safety issue${safetyIssues.length > 1 ? 's' : ''} create strong leverage`);
    }
    
    if (highLeverageIssues.length >= 3) {
      score += 10;
      factors.push('Multiple high-priority issues strengthen position');
    }
    
    if (marketConditions.marketType === 'buyer') {
      score += 10;
      factors.push("Buyer's market provides additional negotiating power");
    }
    
    // Market-specific factors
    if (marketConditions.localTrends === 'declining') {
      score += 5;
      factors.push('Declining market trends favor buyers');
    }
    
    if (marketConditions.competitionLevel === 'low') {
      score += 5;
      factors.push('Low competition increases negotiation flexibility');
    }
    
    // Negative factors
    if (marketConditions.marketType === 'seller') {
      score -= 15;
      factors.push("Seller's market limits negotiation leverage");
    }
    
    if (issues.length < 3) {
      score -= 5;
      factors.push('Limited number of issues reduces options');
    }
    
    // Determine level
    if (score >= 85) level = 'VERY_STRONG';
    else if (score >= 70) level = 'STRONG';
    else if (score >= 50) level = 'MODERATE';
    else level = 'WEAK';
    
    // Ensure we have enough factors
    while (factors.length < 3) {
      if (factors.length === 0) factors.push('Professional inspection documentation supports claims');
      if (factors.length === 1) factors.push('Market-rate cost estimates provide credible basis');
      if (factors.length === 2) factors.push('Reasonable request shows good faith negotiation');
    }
    
    return {
      level,
      factors: factors.slice(0, 4),
      score: Math.max(0, Math.min(100, score))
    };
  }

  /**
   * Get default market conditions (can be enhanced with real data)
   */
  static getDefaultMarketConditions(): MarketConditions {
    const currentMonth = new Date().getMonth();
    
    // Simple seasonal adjustments
    let seasonalFactor = 1.0;
    if (currentMonth >= 2 && currentMonth <= 5) { // Spring/Early Summer
      seasonalFactor = 1.1; // Busy season
    } else if (currentMonth >= 10 || currentMonth <= 1) { // Winter
      seasonalFactor = 0.95; // Slower season
    }
    
    return {
      marketType: 'balanced',
      seasonalFactor,
      localTrends: 'stable',
      competitionLevel: 'medium'
    };
  }
}