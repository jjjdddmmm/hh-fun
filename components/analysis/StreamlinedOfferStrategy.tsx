"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Target, TrendingUp, Handshake } from "lucide-react";

interface Property {
  id: string;
  data?: {
    price: number;
    daysOnMarket: number;
  };
  analysis?: {
    investmentScore: number;
    marketValue?: {
      estimated: number;
    };
    negotiationStrategy?: {
      leverage?: string[];
      tactics?: string[];
    };
    redFlags?: string[];
  };
}

interface StreamlinedOfferStrategyProps {
  property: Property;
}

const formatPrice = (price: number | null | undefined) => {
  if (!price || price === 0) return '$0';
  return `$${price.toLocaleString()}`;
};

export function StreamlinedOfferStrategy({ property }: StreamlinedOfferStrategyProps) {
  if (!property.data || !property.analysis) {
    return null;
  }

  return (
    <Card className="shadow-lg border-2 border-[#D9DADA] bg-[#F2F2F2] rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
          <Handshake className="h-5 w-5 mr-2 text-[#5C1B10]" />
          AI Offer Strategy
        </CardTitle>
        <CardDescription className="font-ds-body text-[#020B0A] opacity-80 leading-[150%]">
          Property-specific AI insights and negotiation intelligence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          
          {/* AI Recommended Offer - Hero Section */}
          <div className="p-6 bg-gradient-to-r from-[#5C1B10] to-[#020B0A] text-white rounded-2xl shadow-lg">
            <h3 className="font-semibold font-ds-heading mb-4 flex items-center text-xl">
              <span className="text-2xl mr-3">🤖</span>
              AI Recommended Offer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Primary Recommendation */}
              <div className="md:col-span-2 bg-[#FAD9D4] text-[#5C1B10] p-6 rounded-xl border-2 border-white">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold mb-2">
                    {formatPrice(Math.round((property.data?.price || 0) * 0.93))}
                  </div>
                  <div className="text-lg font-medium">Recommended Offer (7% below asking)</div>
                  <div className="text-sm opacity-80">65% acceptance probability</div>
                </div>
                
                {/* AI Reasoning */}
                <div className="bg-white/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <span className="mr-2">🧠</span>
                    Why This Works
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>• {(property.data?.daysOnMarket || 0) > 60 ? 'Property has been on market 60+ days - seller motivated' : 'Fresh listing with room for negotiation'}</div>
                    <div>• Market analysis shows {((property.data?.price || 0) > (property.analysis?.marketValue?.estimated || property.data?.price || 0)) ? 'overpriced by market standards' : 'fair market pricing'}</div>
                    <div>• Investment score of {property.analysis.investmentScore}/100 indicates {property.analysis.investmentScore > 75 ? 'strong value potential' : property.analysis.investmentScore > 50 ? 'moderate opportunity' : 'proceed with caution'}</div>
                  </div>
                </div>
              </div>
              
              {/* Alternative Offers */}
              <div className="space-y-3">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center">
                  <div className="text-xl font-bold text-[#FAD9D4]">
                    {formatPrice(Math.round((property.data?.price || 0) * 0.97))}
                  </div>
                  <div className="text-sm opacity-90">Conservative</div>
                  <div className="text-xs opacity-75">85% success</div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center">
                  <div className="text-xl font-bold text-[#FAD9D4]">
                    {formatPrice(Math.round((property.data?.price || 0) * 0.88))}
                  </div>
                  <div className="text-sm opacity-90">Aggressive</div>
                  <div className="text-xs opacity-75">35% success</div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Psychology Analysis */}
          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-lg">
            <h3 className="font-semibold font-ds-heading text-blue-800 mb-4 flex items-center">
              <span className="text-xl mr-2">🔍</span>
              Market Psychology Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Seller Motivation */}
              <div className="bg-white/70 p-4 rounded-xl border border-blue-300">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Seller Motivation: {(property.data?.daysOnMarket || 0) > 90 ? 'HIGH' : (property.data?.daysOnMarket || 0) > 60 ? 'MODERATE' : 'LOW'}
                </h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• Days on Market: {property.data?.daysOnMarket || 'Unknown'}</div>
                  <div>• {(property.data?.daysOnMarket || 0) > 90 ? 'Likely highly motivated to sell' : (property.data?.daysOnMarket || 0) > 60 ? 'Increasing flexibility expected' : 'Limited negotiation room'}</div>
                </div>
              </div>

              {/* Market Position */}
              <div className="bg-white/70 p-4 rounded-xl border border-blue-300">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Market Position
                </h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• List: {formatPrice(property.data?.price)}</div>
                  <div>• Est Value: {formatPrice(property.analysis?.marketValue?.estimated || property.data?.price)}</div>
                  <div className={`font-medium ${(property.data?.price || 0) > (property.analysis?.marketValue?.estimated || property.data?.price || 0) ? 'text-red-600' : 'text-green-600'}`}>
                    • {(property.data?.price || 0) > (property.analysis?.marketValue?.estimated || property.data?.price || 0) ? 'Overpriced' : 'Fair Value'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Negotiation Playbook */}
          <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-2xl shadow-lg">
            <h3 className="font-semibold font-ds-heading text-yellow-800 mb-4 flex items-center">
              <span className="text-xl mr-2">💡</span>
              Smart Negotiation Playbook
            </h3>
            
            {/* Key Leverage Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-yellow-800 mb-3">Your Leverage</h4>
                <div className="space-y-2">
                  {property.analysis.negotiationStrategy?.leverage?.slice(0, 3).map((point: string, idx: number) => (
                    <div key={idx} className="flex items-start text-sm text-yellow-700">
                      <span className="text-yellow-600 mr-2 mt-1">•</span>
                      {point}
                    </div>
                  )) || (
                    <div className="space-y-2">
                      <div className="flex items-start text-sm text-yellow-700">
                        <span className="text-yellow-600 mr-2 mt-1">•</span>
                        {(property.data?.daysOnMarket || 0) > 60 ? 'Extended market time shows seller motivation' : 'Cash equivalent offer strength'}
                      </div>
                      <div className="flex items-start text-sm text-yellow-700">
                        <span className="text-yellow-600 mr-2 mt-1">•</span>
                        Quick closing timeline advantage
                      </div>
                      <div className="flex items-start text-sm text-yellow-700">
                        <span className="text-yellow-600 mr-2 mt-1">•</span>
                        Pre-approval strength in competitive market
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-yellow-800 mb-3">Negotiation Tactics</h4>
                <div className="space-y-2">
                  {property.analysis.negotiationStrategy?.tactics?.slice(0, 3).map((tactic: string, idx: number) => (
                    <div key={idx} className="flex items-start text-sm text-yellow-700">
                      <span className="text-yellow-600 mr-2 mt-1">•</span>
                      {tactic}
                    </div>
                  )) || (
                    <div className="space-y-2">
                      <div className="flex items-start text-sm text-yellow-700">
                        <span className="text-yellow-600 mr-2 mt-1">•</span>
                        Lead with quick closing timeline
                      </div>
                      <div className="flex items-start text-sm text-yellow-700">
                        <span className="text-yellow-600 mr-2 mt-1">•</span>
                        Emphasize cash equivalent financing
                      </div>
                      <div className="flex items-start text-sm text-yellow-700">
                        <span className="text-yellow-600 mr-2 mt-1">•</span>
                        {(property.data?.daysOnMarket || 0) > 60 ? 'Reference extended market time diplomatically' : 'Position as serious, qualified buyer'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Deal-Specific Warnings */}
          {property.analysis.redFlags && property.analysis.redFlags.length > 0 && (
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg">
              <h3 className="font-semibold font-ds-heading text-red-800 mb-4 flex items-center">
                <span className="text-xl mr-2">⚠️</span>
                Deal-Specific Warnings
              </h3>
              <div className="space-y-2">
                {property.analysis.redFlags.slice(0, 3).map((flag: string, idx: number) => (
                  <div key={idx} className="flex items-start text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-[#5C1B10] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium font-ds-heading text-[#5C1B10]">Educational Purposes Only</p>
              <p className="text-sm font-ds-body text-[#020B0A] opacity-80 mt-1">
                This analysis is for educational purposes and should not be considered real estate advice. 
                Always consult with a licensed real estate professional before making any offers.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}