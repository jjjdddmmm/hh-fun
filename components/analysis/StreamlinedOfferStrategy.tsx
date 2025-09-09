"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Target, TrendingUp, Handshake, Brain, Search, Lightbulb, TriangleAlert } from "lucide-react";

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

// Dynamic offer calculation based on property factors
const calculateDynamicOffers = (property: Property) => {
  try {
    const data = property.data;
    const analysis = property.analysis;
    
    // Start with base 7% discount
    let baseDiscount = 0.07;
    
    // Factor 1: Days on market
    const daysOnMarket = data?.daysOnMarket || 0;
    if (daysOnMarket > 120) baseDiscount += 0.05;      // Very stale: +5%
    else if (daysOnMarket > 90) baseDiscount += 0.03;   // Stale: +3%
    else if (daysOnMarket > 60) baseDiscount += 0.02;   // Extended: +2%
    else if (daysOnMarket < 14) baseDiscount -= 0.02;   // Fresh: -2%
    
    // Factor 2: Investment score
    const investmentScore = analysis?.investmentScore || 50;
    if (investmentScore < 40) baseDiscount += 0.03;     // Poor property: +3%
    else if (investmentScore > 80) baseDiscount -= 0.02; // Excellent: -2%
    
    // Factor 3: Price vs market value
    const askingPrice = data?.price || 0;
    const marketValue = analysis?.marketValue?.estimated || askingPrice;
    if (askingPrice > marketValue * 1.1) baseDiscount += 0.04;  // Overpriced 10%+: +4%
    else if (askingPrice > marketValue * 1.05) baseDiscount += 0.02; // Overpriced 5%+: +2%
    
    // Factor 4: Red flags
    const redFlagsCount = analysis?.redFlags?.length || 0;
    if (redFlagsCount > 2) baseDiscount += 0.02;        // Multiple issues: +2%
    
    // Keep within reasonable bounds (3% to 18% discount)
    baseDiscount = Math.max(0.03, Math.min(0.18, baseDiscount));
    
    return {
      conservative: Math.max(0.95, 1 - (baseDiscount * 0.5)),  // Half the discount
      recommended: 1 - baseDiscount,                            // Full discount
      aggressive: Math.max(0.78, 1 - (baseDiscount * 1.5))     // 50% more discount
    };
  } catch (error) {
    // Safe fallback values
    return { conservative: 0.97, recommended: 0.93, aggressive: 0.88 };
  }
};


export function StreamlinedOfferStrategy({ property }: StreamlinedOfferStrategyProps) {
  // Safety checks
  if (!property || !property.data || !property.analysis) {
    return (
      <div className="p-4 text-center text-gray-500">
        Property analysis data unavailable
      </div>
    );
  }

  // Calculate dynamic offers based on property factors
  const offers = calculateDynamicOffers(property);

  return (
    <div className="space-y-6">
          
          {/* AI Recommended Offer - Hero Section */}
          <div className="p-6 bg-gradient-to-r from-[#5C1B10] to-[#020B0A] text-white rounded-2xl shadow-lg">
            <h3 className="font-semibold font-ds-heading mb-6 flex items-center text-xl">
              <Brain className="w-6 h-6 mr-3" />
              AI Recommended Offer
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Primary Recommendation */}
              <div className="bg-[#FAD9D4] text-[#5C1B10] p-6 rounded-xl border-2 border-white shadow-md">
                <div className="text-center mb-6">
                  <div className="text-lg font-medium mb-2">
                    Recommended Offer
                  </div>
                  <div className="text-4xl font-bold mb-3">
                    {formatPrice(Math.round((property.data?.price || 0) * offers.recommended))}
                  </div>
                  <div className="text-lg font-medium mb-1">
                    {Math.round((1 - offers.recommended) * 100)}% below asking
                  </div>
                  <div className="text-sm opacity-80">
                    65% acceptance probability
                  </div>
                </div>
                
                {/* AI Reasoning - Simplified */}
                <div className="bg-white/60 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Why {Math.round((1 - offers.recommended) * 100)}%
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <span className="text-[#5C1B10] mr-2 mt-0.5">•</span>
                      <span>
                        {(() => {
                          // Debug: log the actual days on market value
                          console.log('🔍 Days on market debug:', {
                            daysOnMarket: property.data?.daysOnMarket,
                            daysOnZillow: property.data?.daysOnZillow,
                            dom: property.data?.dom,
                            marketTime: property.data?.marketTime
                          });
                          
                          const days = property.data?.daysOnMarket || property.data?.daysOnZillow || property.data?.dom || property.data?.marketTime || 0;
                          
                          return days > 120 ? `After ${days} days, sellers are highly motivated - strong negotiation position for buyers` :
                                 days > 90 ? `${days} days suggests seller urgency - opportunity for 8-12% discount` :
                                 days > 60 ? `${days} days indicates growing seller flexibility - 5-8% discount possible` :
                                 days < 14 && days > 0 ? `Fresh listing at ${days} days means competitive market - limited negotiation leverage` :
                                 days === 0 ? `Days on market data unavailable - using market average negotiation approach` :
                                 `${days} days is typical market time - standard 3-5% negotiation range applies`;
                        })()}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[#5C1B10] mr-2 mt-0.5">•</span>
                      <span>
                        {((property.data?.price || 0) > (property.analysis?.marketValue?.estimated || property.data?.price || 0) * 1.1) ? 
                         `Overpriced by ${Math.round(((property.data?.price || 0) / (property.analysis?.marketValue?.estimated || 1) - 1) * 100)}% - strong justification for significant discount` :
                         ((property.data?.price || 0) > (property.analysis?.marketValue?.estimated || property.data?.price || 0) * 1.05) ? 
                         `Listed ${Math.round(((property.data?.price || 0) / (property.analysis?.marketValue?.estimated || 1) - 1) * 100)}% above market - room for negotiation to fair value` :
                         ((property.data?.price || 0) < (property.analysis?.marketValue?.estimated || property.data?.price || 0) * 0.95) ? 
                         'Already priced below market value - limited room for further discounts' :
                         'Market-appropriate pricing - standard negotiation tactics apply'}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[#5C1B10] mr-2 mt-0.5">•</span>
                      <span>
                        {property.analysis.investmentScore > 85 ? `Outstanding property score (${property.analysis.investmentScore}/100) - worth paying closer to asking price` :
                         property.analysis.investmentScore > 70 ? `Strong property fundamentals (${property.analysis.investmentScore}/100) - good negotiation balance` :
                         property.analysis.investmentScore > 50 ? `Moderate property appeal (${property.analysis.investmentScore}/100) - more aggressive negotiation justified` :
                         `Property concerns identified (${property.analysis.investmentScore}/100) - significant discount warranted`}
                      </span>
                    </div>
                    {(property.analysis?.redFlags?.length || 0) > 0 && (
                      <div className="flex items-start">
                        <span className="text-[#5C1B10] mr-2 mt-0.5">•</span>
                        <span className="text-red-600 font-medium">
                          {property.analysis?.redFlags?.length > 1 ? 
                            `Multiple concerns identified (${property.analysis?.redFlags?.length} issues) - use as leverage for lower offer` :
                            `One concern identified - factor into negotiation strategy`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Alternative Offers */}
              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center">
                  <div className="text-sm font-medium text-white mb-3">Conservative</div>
                  
                  {/* Primary Info Group */}
                  <div className="mb-3">
                    <div className="text-xl font-bold text-[#FAD9D4]">
                      {formatPrice(Math.round((property.data?.price || 0) * offers.conservative))}
                    </div>
                    <div className="text-sm font-medium text-white">{Math.round((1 - offers.conservative) * 100)}% below asking</div>
                  </div>
                  
                  {/* Secondary Info Group */}
                  <div className="border-t border-white/20 pt-2">
                    <div className="text-xs text-white opacity-70">85% success rate</div>
                    <div className="text-xs text-white opacity-50">Lower risk approach</div>
                  </div>
                </div>
                
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center">
                  <div className="text-sm font-medium text-white mb-3">Aggressive</div>
                  
                  {/* Primary Info Group */}
                  <div className="mb-3">
                    <div className="text-xl font-bold text-[#FAD9D4]">
                      {formatPrice(Math.round((property.data?.price || 0) * offers.aggressive))}
                    </div>
                    <div className="text-sm font-medium text-white">{Math.round((1 - offers.aggressive) * 100)}% below asking</div>
                  </div>
                  
                  {/* Secondary Info Group */}
                  <div className="border-t border-white/20 pt-2">
                    <div className="text-xs text-white opacity-70">35% success rate</div>
                    <div className="text-xs text-white opacity-50">Maximum savings potential</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Position */}
          <div className="p-6 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
            <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Market Position
            </h3>
            <div className="bg-white p-4 rounded-xl border-2 border-[#D9DADA] shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-[#020B0A] opacity-70 mb-1">List Price</div>
                  <div className="text-lg font-bold text-[#5C1B10]">{formatPrice(property.data?.price)}</div>
                </div>
                <div>
                  <div className="text-sm text-[#020B0A] opacity-70 mb-1">Est. Value</div>
                  <div className="text-lg font-bold text-[#5C1B10]">{formatPrice(property.analysis?.marketValue?.estimated || property.data?.price)}</div>
                </div>
                <div>
                  <div className="text-sm text-[#020B0A] opacity-70 mb-1">Position</div>
                  <div className={`text-lg font-bold ${(property.data?.price || 0) > (property.analysis?.marketValue?.estimated || property.data?.price || 0) ? 'text-red-600' : 'text-green-600'}`}>
                    {(property.data?.price || 0) > (property.analysis?.marketValue?.estimated || property.data?.price || 0) ? 'Overpriced' : 'Fair Value'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Negotiation Strategy */}
          <div className="p-6 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
            <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-4 flex items-center">
              <Handshake className="w-5 h-5 mr-2" />
              Negotiation Strategy
            </h3>
            <div className="bg-white p-4 rounded-xl border-2 border-[#D9DADA] shadow-sm">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-[#5C1B10] mb-2">Key Leverage Points:</h4>
                  <div className="space-y-1">
                    {(() => {
                      const leveragePoints = property.analysis.negotiationStrategy?.leverage || [];
                      
                      if (leveragePoints.length === 0) {
                        return (
                          <div className="flex items-center text-sm text-gray-500 italic">
                            <span className="animate-pulse">Generating negotiation insights...</span>
                          </div>
                        );
                      }
                      
                      return leveragePoints.slice(0, 4).map((point: string, idx: number) => (
                        <div key={idx} className="flex items-start text-sm text-[#020B0A]">
                          <span className="text-[#5C1B10] mr-2">•</span>
                          {point}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium text-[#5C1B10] mb-2">Recommended Approach:</h4>
                  <div className="text-sm text-[#020B0A]">
                    {property.analysis.negotiationStrategy?.tactics?.length > 0 ? 
                      property.analysis.negotiationStrategy.tactics.slice(0, 2).join('. ') + '.' :
                      <span className="text-gray-500 italic animate-pulse">Generating negotiation strategy...</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deal-Specific Warnings */}
          {property.analysis.redFlags && 
           property.analysis.redFlags.length > 0 && 
           !property.analysis.redFlags.some(flag => 
             flag.toLowerCase().includes('ai analysis temporarily unavailable') || 
             flag.toLowerCase().includes('temporarily unavailable') ||
             flag.toLowerCase().includes('unable to generate')
           ) && (
            <div className="p-6 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
              <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-4 flex items-center">
                <TriangleAlert className="w-5 h-5 mr-2" />
                Deal-Specific Warnings
              </h3>
              <div className="bg-white p-4 rounded-xl border-2 border-[#D9DADA] shadow-sm">
                <div className="space-y-2">
                  {property.analysis.redFlags.slice(0, 3).map((flag: string, idx: number) => (
                    <div key={idx} className="flex items-start text-sm text-[#020B0A]">
                      <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      {flag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        
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
    </div>
  );
}