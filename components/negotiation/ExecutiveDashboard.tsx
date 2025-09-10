"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Shield,
  Clock
} from "lucide-react";

export interface NegotiationStrength {
  level: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  factors: string[];
  score: number; // 0-100
}

export interface ExecutiveSummary {
  totalNegotiationPower: number;
  recommendedAsk: number;
  successRate: number;
  negotiationStrength: NegotiationStrength;
  breakdown: {
    critical: { amount: number; percentage: number };
    major: { amount: number; percentage: number };
    minor: { amount: number; percentage: number };
  };
  marketContext: {
    marketType: 'seller' | 'buyer' | 'balanced';
    seasonalFactor: number;
    localTrends: string;
  };
}

interface ExecutiveDashboardProps {
  summary: ExecutiveSummary;
  reportType: string | 'multiple';
  selectedView?: string;
  currentReport?: any;
}

export function ExecutiveDashboard({ summary, reportType, selectedView = 'consolidated', currentReport }: ExecutiveDashboardProps) {
  const getStrengthColor = (strength: NegotiationStrength['level']) => {
    switch (strength) {
      case 'VERY_STRONG':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'STRONG':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'WEAK':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStrengthIcon = (strength: NegotiationStrength['level']) => {
    switch (strength) {
      case 'VERY_STRONG':
      case 'STRONG':
        return <Shield className="h-5 w-5" />;
      case 'MODERATE':
        return <TrendingUp className="h-5 w-5" />;
      case 'WEAK':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getClaudeInsights = (view: string, report: any, summary: ExecutiveSummary, type: string) => {
    if (view === 'consolidated') {
      // For consolidated view, show all issues from all reports
      const allIssues: any[] = [];
      
      // If we have multiple reports, collect all issues
      if (Array.isArray(report)) {
        report.forEach(r => {
          if (r?.detailedAnalysis?.issues) {
            allIssues.push(...r.detailedAnalysis.issues);
          }
        });
      } else if (report?.detailedAnalysis?.issues) {
        allIssues.push(...report.detailedAnalysis.issues);
      }

      // Group issues by severity
      const criticalIssues = allIssues.filter((issue: any) => issue.severity === 'critical');
      const majorIssues = allIssues.filter((issue: any) => issue.severity === 'major');  
      const minorIssues = allIssues.filter((issue: any) => issue.severity === 'minor');

      const renderIssueList = (issues: any[], title: string, bgColor: string, textColor: string) => {
        if (issues.length === 0) return null;
        
        return (
          <div className={`${bgColor} rounded-lg p-4 border border-white/20`}>
            <h4 className={`font-semibold ${textColor} mb-3 flex items-center gap-2`}>
              {title === 'Critical Issues' && <AlertTriangle className="h-4 w-4" />}
              {title === 'Major Issues' && <Shield className="h-4 w-4" />}
              {title === 'Minor Issues' && <Clock className="h-4 w-4" />}
              {title} ({issues.length})
            </h4>
            <div className="space-y-2">
              {issues.map((issue: any, index: number) => (
                <div key={index} className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {issue.category} - {issue.location}
                    </p>
                    <p className="text-xs text-white/70 line-clamp-2">
                      {issue.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(issue.negotiationValue)}
                    </p>
                    <p className="text-xs text-white/60">
                      {Math.round(issue.confidence * 100)}% conf.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      };

      return (
        <div className="space-y-6">
          <div>
            <p className="mb-4">
              <strong>Analysis Complete:</strong> I found {allIssues.length} total issues across your inspection reports. 
              Your negotiation position is <strong>{summary.negotiationStrength.level.toLowerCase().replace('_', ' ')}</strong> 
              with a {formatCurrency(summary.recommendedAsk)} recommended ask.
            </p>
            
            <p className="mb-4">
              <strong>Strategic Overview:</strong> Focus on critical and major issues first - they account for 
              {Math.round(summary.breakdown.critical.percentage + summary.breakdown.major.percentage)}% of your total ask 
              and represent legitimate concerns any buyer would raise.
            </p>
          </div>

          {/* Show all issues organized by severity */}
          <div className="space-y-4">
            {renderIssueList(criticalIssues, 'Critical Issues', 'bg-red-900/30', 'text-red-300')}
            {renderIssueList(majorIssues, 'Major Issues', 'bg-orange-900/30', 'text-orange-300')}
            {renderIssueList(minorIssues, 'Minor Issues', 'bg-yellow-900/30', 'text-yellow-300')}
          </div>

          {allIssues.length > 0 && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm">
                <strong>My recommendation:</strong> Lead with the {criticalIssues.length + majorIssues.length} high-priority issues above. 
                These represent {formatCurrency(criticalIssues.reduce((sum: number, issue: any) => sum + issue.negotiationValue, 0) + majorIssues.reduce((sum: number, issue: any) => sum + issue.negotiationValue, 0))} in 
                well-documented problems that require immediate attention.
              </p>
            </div>
          )}
        </div>
      );
    } else {
      const reportName = report?.name || 'this report';
      const reportTypeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      const detailedAnalysis = report?.detailedAnalysis;
      
      
      // Get specific insights from Claude's actual analysis
      const specificIssues = detailedAnalysis?.issues || [];
      const highConfidenceIssues = specificIssues.filter((issue: any) => issue.confidence > 0.8);
      const mostExpensiveIssue = specificIssues.reduce((max: any, issue: any) => 
        issue.negotiationValue > (max?.negotiationValue || 0) ? issue : max, null);
      
      // If no detailedAnalysis data, show diagnostic message
      if (!detailedAnalysis || !specificIssues.length) {
        return (
          <div className="space-y-4">
            <p>
              <strong>Focusing on {reportName}:</strong> This {reportTypeLabel.toLowerCase()} inspection reveals specific issues that strengthen your negotiation position.
            </p>
            <div className="bg-white/5 rounded-lg p-4 border border-white/20">
              <p className="text-sm">
                <strong>⚠️ Debug Info:</strong> {!detailedAnalysis ? 'No detailedAnalysis data found.' : 'No issues in detailedAnalysis.'} 
                Using general strategy approach.
              </p>
            </div>
            <p>
              <strong>Key insight:</strong> {type === 'home' ? 'Home inspections often uncover structural or system issues that sellers are motivated to address quickly.' : 
              type === 'pool' ? 'Pool issues can be expensive and are often deal-breakers for other buyers, giving you leverage.' :
              type === 'chimney' ? 'Chimney and fireplace issues represent safety concerns that sellers typically want to resolve.' :
              type === 'sewer' ? 'Sewer line problems are costly, urgent, and often not visible to other potential buyers.' :
              'These specialized inspection findings often reveal issues that other buyers might miss.'}
            </p>
          </div>
        );
      }

      // Group issues by severity for single report view
      const criticalIssues = specificIssues.filter((issue: any) => issue.severity === 'critical');
      const majorIssues = specificIssues.filter((issue: any) => issue.severity === 'major');  
      const minorIssues = specificIssues.filter((issue: any) => issue.severity === 'minor');

      const renderIssueList = (issues: any[], title: string, bgColor: string, textColor: string) => {
        if (issues.length === 0) return null;
        
        return (
          <div className={`${bgColor} rounded-lg p-4 border border-white/20`}>
            <h4 className={`font-semibold ${textColor} mb-3 flex items-center gap-2`}>
              {title === 'Critical Issues' && <AlertTriangle className="h-4 w-4" />}
              {title === 'Major Issues' && <Shield className="h-4 w-4" />}
              {title === 'Minor Issues' && <Clock className="h-4 w-4" />}
              {title} ({issues.length})
            </h4>
            <div className="space-y-2">
              {issues.map((issue: any, index: number) => (
                <div key={index} className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {issue.category} - {issue.location}
                    </p>
                    <p className="text-xs text-white/70 line-clamp-2">
                      {issue.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(issue.negotiationValue)}
                    </p>
                    <p className="text-xs text-white/60">
                      {Math.round(issue.confidence * 100)}% conf.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      };

      return (
        <div className="space-y-6">
          <div>
            <p className="mb-4">
              <strong>Focusing on {reportName}:</strong> This {reportTypeLabel.toLowerCase()} inspection found {specificIssues.length} total issues. 
              Here's the complete breakdown of problems that strengthen your negotiation position.
            </p>

            {mostExpensiveIssue && (
              <p className="mb-4">
                <strong>Top concern:</strong> The most significant issue is <strong>{mostExpensiveIssue.category}</strong> in the {mostExpensiveIssue.location} 
                ({formatCurrency(mostExpensiveIssue.negotiationValue)} value).
              </p>
            )}
          </div>

          {/* Show all issues organized by severity */}
          <div className="space-y-4">
            {renderIssueList(criticalIssues, 'Critical Issues', 'bg-red-900/30', 'text-red-300')}
            {renderIssueList(majorIssues, 'Major Issues', 'bg-orange-900/30', 'text-orange-300')}
            {renderIssueList(minorIssues, 'Minor Issues', 'bg-yellow-900/30', 'text-yellow-300')}
          </div>

          {specificIssues.length > 0 && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm">
                <strong>Strategic recommendation:</strong> Focus on the {criticalIssues.length + majorIssues.length} high-priority issues above. 
                These represent {formatCurrency(criticalIssues.reduce((sum: number, issue: any) => sum + issue.negotiationValue, 0) + majorIssues.reduce((sum: number, issue: any) => sum + issue.negotiationValue, 0))} in 
                well-documented problems that any buyer would expect the seller to address.
              </p>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <Card className="border-2 border-[#5C1B10] bg-gradient-to-br from-[#5C1B10] to-[#4A1508] text-white">
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-6 w-6" />
            <h2 className="text-2xl font-bold">
              Negotiation Strategy: {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Inspection
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Left Column - Key Numbers */}
            <div className="flex flex-col">
              <div className="h-28 flex flex-col justify-center mb-6">
                <p className="text-sm text-white/70 mb-2">Recommended Ask</p>
                <p className="text-6xl font-bold text-white">
                  {formatCurrency(summary.recommendedAsk)}
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3 text-white">Cost Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/80">Critical Issues</span>
                    <div className="text-right">
                      <span className="font-semibold text-white">
                        {formatCurrency(summary.breakdown.critical.amount)}
                      </span>
                      <span className="text-xs text-white/70 ml-2">
                        ({summary.breakdown.critical.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/80">Major Repairs</span>
                    <div className="text-right">
                      <span className="font-semibold text-white">
                        {formatCurrency(summary.breakdown.major.amount)}
                      </span>
                      <span className="text-xs text-white/70 ml-2">
                        ({summary.breakdown.major.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/80">Minor Issues</span>
                    <div className="text-right">
                      <span className="font-semibold text-white">
                        {formatCurrency(summary.breakdown.minor.amount)}
                      </span>
                      <span className="text-xs text-white/70 ml-2">
                        ({summary.breakdown.minor.percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                  {getStrengthIcon(summary.negotiationStrength.level)}
                  Negotiation Strength
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/80">Position Level</span>
                    <span className="font-semibold text-white">
                      {summary.negotiationStrength.level.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/80">Success Rate</span>
                    <span className="font-semibold text-white">
                      {summary.successRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Position Assessment */}
            <div className="flex flex-col">
              <div className="h-28 flex flex-col justify-center mb-6">
                {/* Empty space to maintain alignment */}
              </div>

              <div className="bg-white/10 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Your Advantages
                </h3>
                <ul className="space-y-2">
                  {summary.negotiationStrength.factors.slice(0, 3).map((factor, index) => (
                    <li key={index} className="text-sm text-white/80 flex items-start gap-2">
                      <span className="text-white/60">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-white">Market Context</h3>
                <p className="text-sm text-white/80 capitalize mb-1">
                  {summary.marketContext.marketType}&apos;s market • {summary.marketContext.localTrends}
                </p>
                <p className="text-xs text-white/70">
                  Seasonal factor: {summary.marketContext.seasonalFactor > 1 ? 'Favorable' : 'Standard'} timing
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Claude's Natural Language Insights */}
        <div className="mt-8 bg-white/10 rounded-lg p-6">
          <h3 className="font-semibold mb-4 text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Claude&apos;s Analysis & Strategy
          </h3>
          <div className="prose prose-invert text-white/90 text-sm leading-relaxed space-y-4">
            {getClaudeInsights(selectedView, currentReport, summary, reportType)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}