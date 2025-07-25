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
  reportType: string;
}

export function ExecutiveDashboard({ summary, reportType }: ExecutiveDashboardProps) {
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
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/70 mb-1">Recommended Ask</p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(summary.recommendedAsk)}
                </p>
                <p className="text-sm text-white/80 mt-1">
                  {summary.successRate}% success rate
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-white">Cost Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/80">Critical Issues</span>
                    <div className="text-right">
                      <span className="font-semibibold text-white">
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
            </div>

            {/* Right Column - Position Assessment */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {getStrengthIcon(summary.negotiationStrength.level)}
                  <p className="text-sm text-white/70">Negotiation Strength</p>
                </div>
                <Badge 
                  className={`${getStrengthColor(summary.negotiationStrength.level)} text-lg px-3 py-1 font-bold`}
                  variant="outline"
                >
                  {summary.negotiationStrength.level.replace('_', ' ')}
                </Badge>
                <div className="mt-2">
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-500"
                      style={{ width: `${summary.negotiationStrength.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    Strength Score: {summary.negotiationStrength.score}/100
                  </p>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-4">
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
                <h3 className="font-semibold mb-2 text-white">Market Context</h3>
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
      </CardContent>
    </Card>
  );
}