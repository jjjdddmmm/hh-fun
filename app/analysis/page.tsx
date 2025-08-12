"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/utils/logger";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Home, Plus, TrendingUp, DollarSign, MapPin, Square, Bed, Bath, AlertCircle, Loader2, X, ExternalLink, Users, Trash2, RefreshCw, Hammer, PartyPopper, Handshake, Calendar, Target, Shield, Lightbulb, ChevronDown, Clock } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppNavigation from "@/components/app-navigation";
import AppFooter from "@/components/app-footer";
import { StreamlinedOfferStrategy } from "@/components/analysis/StreamlinedOfferStrategy";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { useConfirmation } from "@/lib/contexts/ConfirmationContext";

interface Property {
  id: string;
  mlsUrl: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: 'pending' | 'analyzed' | 'error';
  hasTimeline?: boolean;
  data?: {
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
  };
  analysis?: {
    marketValue: { low: number; high: number; estimated: number; confidence: number };
    recommendation: 'excellent' | 'good' | 'fair' | 'overpriced' | 'investigate';
    keyInsights: string[];
    redFlags: string[];
    investmentScore: number;
    // Enhanced BatchData + AI scoring fields
    investmentGrade?: string;
    investmentRecommendation?: string;
    scoreBreakdown?: any;
    keyOpportunities?: string[];
    negotiationStrategy: {
      suggestedOffer: number;
      tactics: string[];
      leverage: string[];
    };
    financialProjection: {
      monthlyMortgage: number;
      downPayment: number;
      closingCosts: number;
      monthlyExpenses: number;
      cashFlow: number;
    };
    marketAnalysis: {
      pricePerSqftComparison: string;
      marketTrend: string;
      demandLevel: string;
      appreciation: string;
    };
    aiConfidence: number;
    analysis: string;
  };
}

const formatPrice = (price: number | null | undefined) => {
  if (!price || price === 0) return '$0';
  
  // Always show full numbers with proper comma formatting
  return `$${price.toLocaleString()}`;
};

const getRecommendationColor = (recommendation: string) => {
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
const calculateScoreBreakdown = (property: Property) => {
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

export default function PropertyAnalysisPage() {
  const { user } = useUser();
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useNotifications();
  const { confirm } = useConfirmation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [newMlsUrl, setNewMlsUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [comparables, setComparables] = useState<any>(null);
  const [loadingComps, setLoadingComps] = useState<string | null>(null); // Track which property ID is loading
  const [areaData, setAreaData] = useState<any>(null);
  const [showInvestmentScore, setShowInvestmentScore] = useState(false);
  const [activeOfferTab, setActiveOfferTab] = useState<'strategy'>('strategy');
  const [creatingTimeline, setCreatingTimeline] = useState<string | null>(null);
  
  // State for collapsible sections in Investment Score
  const [expandedScoreSections, setExpandedScoreSections] = useState({
    breakdown: false,
    opportunities: false,
    legacy: false,
    positiveFactors: false,
    redFlags: false,
    marketContext: false
  });
  const [loadingSections, setLoadingSections] = useState<string[]>([]);

  // Load user's properties
  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user]);


  // ESC key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedProperty) {
        setSelectedProperty(null);
        setComparables(null);
        setAreaData(null);
        setShowInvestmentScore(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      const response = await fetch('/api/properties');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Check timeline existence for each property
          const propertiesWithTimeline = await Promise.all(
            data.properties.map(async (property: Property) => {
              const hasTimeline = await checkTimelineExists(property.id);
              return { ...property, hasTimeline };
            })
          );
          setProperties(propertiesWithTimeline);
        }
      }
    } catch (error) {
      logger.error('Error loading properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProperty = async () => {
    if (!newMlsUrl.trim() || !user) return;
    
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mlsUrl: newMlsUrl.trim(),
          clerkId: user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save property: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      if (result.message) {
        // Property already exists
        showWarning(result.message, "Property Already Exists");
        setNewMlsUrl("");
        return;
      }
      
      const newProperty: Property = {
        id: result.property.id,
        mlsUrl: newMlsUrl.trim(),
        address: result.property.address || 'Analyzing...',
        city: result.property.city || '',
        state: result.property.state || '',
        zipCode: result.property.zipCode || '',
        status: 'pending'
      };
      
      setProperties(prev => [...prev, newProperty]);
      setNewMlsUrl("");
      
      analyzeProperty(newProperty);
    } catch (error) {
      logger.error('❌ Failed to add property:', error);
      showError(`Error: ${(error as Error).message}`, "Failed to Add Property");
    }
  };

  const analyzeProperty = async (property: Property) => {
    try {
      const response = await fetch('/api/property-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          propertyId: property.id,
          mlsUrl: property.mlsUrl 
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setProperties(prev => 
          prev.map(p => 
            p.id === property.id 
              ? { ...p, status: 'analyzed', data: result.data.property, analysis: result.data.analysis }
              : p
          )
        );
      } else {
        setProperties(prev => 
          prev.map(p => 
            p.id === property.id 
              ? { ...p, status: 'error' }
              : p
          )
        );
      }
    } catch (error) {
      logger.error('❌ Analysis error:', error);
      setProperties(prev => 
        prev.map(p => 
          p.id === property.id 
            ? { ...p, status: 'error' }
            : p
        )
      );
    }
  };

  const deleteProperty = async (propertyId: string) => {
    const confirmed = await confirm({
      title: "Delete Property",
      description: "Are you sure you want to delete this property? This will remove it from your dashboard but preserve the analysis data.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "destructive"
    });
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      // Remove from local state
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      showSuccess("Property deleted successfully");
    } catch (error) {
      logger.error('❌ Delete error:', error);
      showError('Failed to delete property. Please try again.', "Delete Failed");
    }
  };

  const refreshProperty = async (property: Property) => {
    const confirmed = await confirm({
      title: "Refresh Property Analysis",
      description: "This will refresh the property data and re-run AI analysis. Continue?",
      confirmText: "Refresh",
      cancelText: "Cancel",
      type: "info"
    });
    
    if (!confirmed) {
      return;
    }

    try {
      // Set property to analyzing state immediately
      setProperties(prev => 
        prev.map(p => 
          p.id === property.id 
            ? { ...p, status: 'pending', analysis: undefined }
            : p
        )
      );

      // Call refresh endpoint to clear analysis data
      const refreshResponse = await fetch(`/api/properties/${property.id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed: ${refreshResponse.status}`);
      }

      // Re-run the analysis with fresh data
      await analyzeProperty(property);
      
      // Reload the properties to get fresh data
      await loadProperties();
    } catch (error) {
      logger.error('❌ Refresh error:', error);
      showError('Failed to refresh property. Please try again.', "Refresh Failed");
      
      // Set back to error state
      setProperties(prev => 
        prev.map(p => 
          p.id === property.id 
            ? { ...p, status: 'error' }
            : p
        )
      );
    }
  };


  const createTimeline = async (property: Property) => {
    if (!property.data) {
      logger.error('Property data not available');
      return;
    }

    try {
      setCreatingTimeline(property.id);

      // Create timeline with property information
      const response = await fetch('/api/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property.id,
          title: `${property.data.address} - Home Purchase Timeline`,
          estimatedClosingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If timeline already exists (409 conflict), just navigate to it
        if (response.status === 409) {
          router.push(`/timeline?propertyId=${property.id}`);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create timeline');
      }

      const data = await response.json();
      
      if (data.success) {
        // Navigate to the timeline page
        router.push(`/timeline?propertyId=${property.id}`);
      } else {
        throw new Error(data.error || 'Failed to create timeline');
      }
    } catch (error) {
      logger.error('Error creating timeline:', error);
      showError(error instanceof Error ? error.message : 'Failed to create timeline. Please try again.', "Timeline Creation Failed");
    } finally {
      setCreatingTimeline(null);
    }
  };

  const checkTimelineExists = async (propertyId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/timeline?propertyId=${propertyId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.success && data.timeline;
      }
      
      // 404 means timeline doesn't exist, which is fine
      if (response.status === 404) {
        return false;
      }
      
      // Other errors should be logged but not break the flow
      logger.error('Error checking timeline:', new Error(`HTTP ${response.status}: ${response.statusText}`));
      return false;
    } catch (error) {
      logger.error('Error checking timeline:', error);
      return false;
    }
  };

  const navigateToTimeline = (propertyId: string) => {
    router.push(`/timeline?propertyId=${propertyId}`);
  };

  const fetchComparables = async (propertyId: string) => {
    setLoadingComps(propertyId);
    setComparables(null);
    
    try {
      const response = await fetch('/api/comparables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setComparables(result.data);
          // Find the property to show comps for
          const property = properties.find(p => p.id === propertyId);
          if (property) {
            setSelectedProperty(property);
          }
        }
      }
    } catch (error) {
      logger.error('Error fetching comparables:', error);
    } finally {
      setLoadingComps(null);
    }
  };

  const fetchAreaAnalysis = async (propertyId: string) => {
    setAreaData(null);
    
    try {
      const response = await fetch('/api/area-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAreaData(result.data);
          const property = properties.find(p => p.id === propertyId);
          if (property) {
            setSelectedProperty(property);
          }
        }
      }
    } catch (error) {
      logger.error('Error fetching area analysis:', error);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-white flex items-center justify-center">
        <Card className="w-96 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Sign In Required</CardTitle>
            <CardDescription className="text-gray-600">
              Please sign in to analyze properties
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-white">
      <AppNavigation />
      {/* Full Analysis Modal - Responsive */}
      {!!selectedProperty && (
        <div className="fixed inset-0 z-50 flex md:items-center md:justify-center items-end justify-center">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => {
              setSelectedProperty(null);
              setComparables(null);
              setAreaData(null);
              setShowInvestmentScore(false);
            }}
          />
          <div className="relative z-50 w-full max-w-4xl md:mx-8 mx-4">
            <div className="bg-[#F2F2F2] border-2 border-[#020B0A] md:rounded-2xl rounded-t-2xl rounded-b-none shadow-xl md:max-h-[85vh] max-h-[90vh] overflow-hidden">
              <div 
                className="md:p-6 p-4 w-full md:max-h-[85vh] max-h-[90vh] overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#5C1B10 #D9DADA'
                }}
              >
              {!showInvestmentScore && (
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 pr-4">
                    <h2 className="md:text-2xl text-xl font-ds-heading text-[#5C1B10] tracking-[-0.01em] leading-tight">
                      {selectedProperty?.data?.address || 'Property Analysis'}
                    </h2>
                    <p className="font-ds-body text-[#020B0A] opacity-80 leading-[150%] md:text-base text-sm mt-1">
                      {comparables ? 'Comparable Properties' : 
                       areaData ? 'Area & Neighborhood Analysis' : 
                       'Comprehensive AI-powered analysis'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(null);
                      setComparables(null);
                      setAreaData(null);
                      setShowInvestmentScore(false);
                    }}
                    className="md:h-8 md:w-8 h-10 w-10 p-0 flex-shrink-0"
                  >
                    <X className="md:h-4 md:w-4 h-5 w-5" />
                  </Button>
                </div>
              )}

              {showInvestmentScore && (
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#FAD9D4] border-4 border-[#020B0A]">
                      <div className="text-3xl font-bold text-[#020B0A]">{selectedProperty?.analysis?.investmentScore}</div>
                    </div>
                    <div>
                      <SectionHeader className="text-2xl text-[#5C1B10] mb-1">Investment Score Analysis</SectionHeader>
                      <SectionHeader className="text-lg text-[#5C1B10] mb-1">{selectedProperty?.data?.address}</SectionHeader>
                      <p className="font-ds-body text-[#020B0A] opacity-80 leading-[150%]">Detailed breakdown of factors affecting this property&apos;s investment potential</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(null);
                      setComparables(null);
                      setAreaData(null);
                      setShowInvestmentScore(false);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
          
          {areaData && selectedProperty && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <MapPin className="h-5 w-5 mr-2 text-green-600" />
                    Neighborhood Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold">{areaData.walkScore}/100</div>
                      <div className="text-sm text-gray-600">Walk Score</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold">{areaData.schools.elementary.length}</div>
                      <div className="text-sm text-gray-600">Elementary Schools</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold">{areaData.amenities.groceryStores.length}</div>
                      <div className="text-sm text-gray-600">Grocery Stores</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-xl font-bold">{areaData.amenities.restaurants.length}</div>
                      <div className="text-sm text-gray-600">Restaurants</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Nearby Schools</h4>
                      {areaData.schools.elementary.slice(0, 3).map((school: any, idx: number) => (
                        <div key={idx} className="text-sm mb-2">
                          <strong>{school.name}</strong> - {(school.distance / 1000).toFixed(1)}km
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Key Amenities</h4>
                      {areaData.amenities.groceryStores.slice(0, 3).map((store: any, idx: number) => (
                        <div key={idx} className="text-sm mb-2">
                          <strong>{store.name}</strong> - {(store.distance / 1000).toFixed(1)}km
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {showInvestmentScore && selectedProperty?.analysis && (() => {
            // 🚀 Enhanced BatchData + AI Investment Scoring
            const analysis = selectedProperty.analysis;
            const hasEnhancedScore = !!(analysis.scoreBreakdown && analysis.investmentGrade);
            
            // Debug: Log what we're checking for enhanced score
            console.log('🔍 Frontend Enhanced Score Check:', {
              hasScoreBreakdown: !!analysis.scoreBreakdown,
              hasInvestmentGrade: !!analysis.investmentGrade,
              hasEnhancedScore,
              investmentScore: analysis.investmentScore,
              investmentGrade: analysis.investmentGrade,
              scoreBreakdownKeys: analysis.scoreBreakdown ? Object.keys(analysis.scoreBreakdown) : 'none'
            });
            
            // Helper function to get TL;DR summary
            const getTLDRSummary = () => {
              const score = analysis.investmentScore;
              const daysOnMarket = selectedProperty.data?.daysOnMarket || 0;
              
              if (score >= 80) {
                return `Excellent opportunity - property is ${Math.abs(((selectedProperty.data?.price || 0) - (analysis.marketValue?.estimated || selectedProperty.data?.price || 0)) / (selectedProperty.data?.price || 1) * 100).toFixed(0)}% ${(selectedProperty.data?.price || 0) > (analysis.marketValue?.estimated || selectedProperty.data?.price || 0) ? 'overpriced' : 'undervalued'} with ${daysOnMarket} days on market. Act quickly before it's gone.`;
              } else if (score >= 60) {
                return `Good potential with room to negotiate. Property shows ${analysis.keyInsights?.length || 0} positive factors but ${analysis.redFlags?.length || 0} concerns to address.`;
              } else if (score >= 40) {
                return `Proceed with caution - ${analysis.redFlags?.length || 0} red flags identified. Consider only with significant price reduction.`;
              }
              return `Not recommended - better opportunities available in this market. ${analysis.redFlags?.length || 0} major concerns outweigh benefits.`;
            };

            return (
              <div className="space-y-6">

              {/* TL;DR Section - New Addition */}
              <Card className="shadow-lg border-2 border-[#5C1B10] bg-[#FAD9D4] rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-[#5C1B10] mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-[#5C1B10] mb-1">Quick Summary</h3>
                      <p className="text-sm text-[#020B0A]">{getTLDRSummary()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Enhanced Score Breakdown - Only show if no legacy */}
              {hasEnhancedScore && (
                <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => {
                      if (!expandedScoreSections.breakdown) {
                        setLoadingSections(prev => [...prev, 'breakdown']);
                        setTimeout(() => {
                          setLoadingSections(prev => prev.filter(s => s !== 'breakdown'));
                        }, 300);
                      }
                      setExpandedScoreSections(prev => ({ ...prev, breakdown: !prev.breakdown }));
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        <SectionHeader as="span" className="text-[#5C1B10]">
                          <Home className="inline w-5 h-5 mr-2" />
                          Score Details
                        </SectionHeader>
                      </CardTitle>
                      <ChevronDown className={`w-5 h-5 text-[#5C1B10] transition-transform ${expandedScoreSections.breakdown ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                  {expandedScoreSections.breakdown && (
                    <CardContent>
                      {loadingSections.includes('breakdown') ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="space-y-3">
                              <div className="flex justify-between items-center">
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Deal Potential */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-ds-body font-medium text-[#020B0A]">
                              <DollarSign className="inline w-4 h-4 mr-1" />
                              Deal Potential
                            </span>
                            <span className="font-ds-body font-bold text-[#5C1B10]">
                              {analysis.scoreBreakdown.dealPotential.score}/{analysis.scoreBreakdown.dealPotential.maxScore}
                            </span>
                          </div>
                          <div className="w-full bg-[#D9DADA] rounded-full h-3">
                            <div 
                              className="bg-[#5C1B10] h-3 rounded-full" 
                              style={{width: `${(analysis.scoreBreakdown.dealPotential.score / analysis.scoreBreakdown.dealPotential.maxScore) * 100}%`}}
                            ></div>
                          </div>
                          <p className="text-sm font-ds-body text-[#020B0A] font-semibold">
                            UNDERVALUED
                          </p>
                        </div>

                        {/* Market Timing */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-ds-body font-medium text-[#020B0A]">
                              <Clock className="inline w-4 h-4 mr-1" />
                              Market Timing
                            </span>
                            <span className="font-ds-body font-bold text-[#5C1B10]">
                              {analysis.scoreBreakdown.marketTiming.score}/{analysis.scoreBreakdown.marketTiming.maxScore}
                            </span>
                          </div>
                          <div className="w-full bg-[#D9DADA] rounded-full h-3">
                            <div 
                              className="bg-[#5C1B10] h-3 rounded-full" 
                              style={{width: `${(analysis.scoreBreakdown.marketTiming.score / analysis.scoreBreakdown.marketTiming.maxScore) * 100}%`}}
                            ></div>
                          </div>
                          <p className="text-sm font-ds-body text-[#020B0A] font-semibold">
                            OPTIMAL
                          </p>
                        </div>


                        {/* Financial Opportunity */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-ds-body font-medium text-[#020B0A]">
                              <TrendingUp className="inline w-4 h-4 mr-1" />
                              Financial Opportunity
                            </span>
                            <span className="font-ds-body font-bold text-[#5C1B10]">
                              {analysis.scoreBreakdown.financialOpportunity.score}/{analysis.scoreBreakdown.financialOpportunity.maxScore}
                            </span>
                          </div>
                          <div className="w-full bg-[#D9DADA] rounded-full h-3">
                            <div 
                              className="bg-[#5C1B10] h-3 rounded-full" 
                              style={{width: `${(analysis.scoreBreakdown.financialOpportunity.score / analysis.scoreBreakdown.financialOpportunity.maxScore) * 100}%`}}
                            ></div>
                          </div>
                          <p className="text-sm font-ds-body text-[#020B0A] font-semibold">
                            PROFITABLE
                          </p>
                        </div>

                        {/* Risk Assessment */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-ds-body font-medium text-[#020B0A]">
                              <AlertCircle className="inline w-4 h-4 mr-1" />
                              Risk Assessment
                            </span>
                            <span className="font-ds-body font-bold text-[#5C1B10]">
                              {analysis.scoreBreakdown.riskAssessment.score}/{analysis.scoreBreakdown.riskAssessment.maxScore}
                            </span>
                          </div>
                          <div className="w-full bg-[#D9DADA] rounded-full h-3">
                            <div 
                              className="bg-[#5C1B10] h-3 rounded-full" 
                              style={{width: `${(analysis.scoreBreakdown.riskAssessment.score / analysis.scoreBreakdown.riskAssessment.maxScore) * 100}%`}}
                            ></div>
                          </div>
                          <p className="text-sm font-ds-body text-[#020B0A] font-semibold">
                            LOW RISK
                          </p>
                        </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}
              
              {/* AI Insights & Opportunities - Collapsible */}
              {hasEnhancedScore && analysis.keyOpportunities && (
                <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => {
                      if (!expandedScoreSections.opportunities) {
                        setLoadingSections(prev => [...prev, 'opportunities']);
                        setTimeout(() => {
                          setLoadingSections(prev => prev.filter(s => s !== 'opportunities'));
                        }, 300);
                      }
                      setExpandedScoreSections(prev => ({ ...prev, opportunities: !prev.opportunities }));
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        <SectionHeader as="span" className="text-[#5C1B10]">
                          <Lightbulb className="inline w-5 h-5 mr-2" />
                          Key Insights
                        </SectionHeader>
                      </CardTitle>
                      <ChevronDown className={`w-5 h-5 text-[#5C1B10] transition-transform ${expandedScoreSections.opportunities ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                  {expandedScoreSections.opportunities && (
                    <CardContent>
                      {loadingSections.includes('opportunities') ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[1, 2].map((i) => (
                            <div key={i} className="p-4 bg-gray-100 border-2 border-gray-200 rounded-2xl">
                              <div className="h-5 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                              <div className="space-y-2">
                                {[1, 2, 3].map((j) => (
                                  <div key={j} className="flex items-start">
                                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-3 mt-1.5 animate-pulse"></div>
                                    <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Key Opportunities */}
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Opportunities
                          </h4>
                          <ul className="space-y-2">
                            {analysis.keyOpportunities.slice(0, 3).map((opportunity: string, idx: number) => (
                              <li key={idx} className="flex items-start text-sm text-blue-700">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                                {opportunity}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Red Flags */}
                        {analysis.redFlags && analysis.redFlags.length > 0 && (
                          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                            <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Concerns
                            </h4>
                            <ul className="space-y-2">
                              {analysis.redFlags.slice(0, 3).map((redFlag: string, idx: number) => (
                                <li key={idx} className="flex items-start text-sm text-red-700">
                                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                                  {redFlag}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}
              
              {/* Legacy Score Breakdown for older analyses */}
              {!hasEnhancedScore && (() => {
                const legacyScoreBreakdown = calculateScoreBreakdown(selectedProperty);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Market Pricing */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Market Pricing</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">
                          {legacyScoreBreakdown.marketPricing.score}/{legacyScoreBreakdown.marketPricing.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div 
                          className="bg-[#5C1B10] h-3 rounded-full" 
                          style={{width: `${(legacyScoreBreakdown.marketPricing.score / legacyScoreBreakdown.marketPricing.maxScore) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">
                        {legacyScoreBreakdown.marketPricing.description}
                      </p>
                    </div>

                    {/* Property Condition */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Property Condition</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">
                          {legacyScoreBreakdown.propertyCondition.score}/{legacyScoreBreakdown.propertyCondition.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div 
                          className="bg-[#5C1B10] h-3 rounded-full" 
                          style={{width: `${(legacyScoreBreakdown.propertyCondition.score / legacyScoreBreakdown.propertyCondition.maxScore) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">
                        {legacyScoreBreakdown.propertyCondition.description}
                      </p>
                    </div>

                    {/* Location Value */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Location Value</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">
                          {legacyScoreBreakdown.locationValue.score}/{legacyScoreBreakdown.locationValue.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div 
                          className="bg-[#5C1B10] h-3 rounded-full" 
                          style={{width: `${(legacyScoreBreakdown.locationValue.score / legacyScoreBreakdown.locationValue.maxScore) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">
                        {legacyScoreBreakdown.locationValue.description}
                      </p>
                    </div>

                    {/* Cash Flow Potential */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Cash Flow Potential</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">
                          {legacyScoreBreakdown.cashFlowPotential.score}/{legacyScoreBreakdown.cashFlowPotential.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div 
                          className="bg-[#5C1B10] h-3 rounded-full" 
                          style={{width: `${(legacyScoreBreakdown.cashFlowPotential.score / legacyScoreBreakdown.cashFlowPotential.maxScore) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">
                        {legacyScoreBreakdown.cashFlowPotential.description}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Key Positive Factors - Collapsible */}
              <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setExpandedScoreSections(prev => ({ ...prev, positiveFactors: !prev.positiveFactors }))}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      <SectionHeader as="span" className="text-[#5C1B10]">
                        <Shield className="inline w-5 h-5 mr-2" />
                        Key Positive Factors
                      </SectionHeader>
                    </CardTitle>
                    <ChevronDown className={`w-5 h-5 text-[#5C1B10] transition-transform ${expandedScoreSections.positiveFactors ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
                {expandedScoreSections.positiveFactors && (
                  <CardContent>
                    <div className="space-y-3">
                      {selectedProperty.analysis.keyInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                          <div className="w-2 h-2 bg-[#5C1B10] rounded-full mt-2 flex-shrink-0"></div>
                          <span className="font-ds-body text-[#020B0A]">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Red Flags & Concerns - Collapsible */}
              {selectedProperty.analysis.redFlags.length > 0 && (
                <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => setExpandedScoreSections(prev => ({ ...prev, redFlags: !prev.redFlags }))}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        <SectionHeader as="span" className="text-[#5C1B10]">
                          <X className="inline w-5 h-5 mr-2" />
                          Red Flags & Concerns
                        </SectionHeader>
                      </CardTitle>
                      <ChevronDown className={`w-5 h-5 text-[#5C1B10] transition-transform ${expandedScoreSections.redFlags ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                  {expandedScoreSections.redFlags && (
                    <CardContent>
                      <div className="space-y-3">
                        {selectedProperty.analysis.redFlags.map((flag, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <div className="w-2 h-2 bg-[#5C1B10] rounded-full mt-2 flex-shrink-0"></div>
                            <span className="font-ds-body text-[#020B0A]">{flag}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Market Context - Collapsible */}
              <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setExpandedScoreSections(prev => ({ ...prev, marketContext: !prev.marketContext }))}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      <SectionHeader as="span" className="text-[#5C1B10]">
                        <MapPin className="inline w-5 h-5 mr-2" />
                        Market Context & Trends
                      </SectionHeader>
                    </CardTitle>
                    <ChevronDown className={`w-5 h-5 text-[#5C1B10] transition-transform ${expandedScoreSections.marketContext ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
                {expandedScoreSections.marketContext && (
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                          <div className="w-2 h-2 bg-[#5C1B10] rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <span className="font-ds-body text-[#020B0A]">
                              <strong>Price Positioning:</strong> This property is priced <strong>{selectedProperty.analysis.marketAnalysis.pricePerSqftComparison}</strong> relative to comparable properties in the local market area.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                          <div className="w-2 h-2 bg-[#5C1B10] rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <span className="font-ds-body text-[#020B0A]">
                              <strong>Market Activity:</strong> Current buyer demand in this area is <strong>{selectedProperty.analysis.marketAnalysis.demandLevel}</strong>, indicating market momentum and competition levels.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                          <div className="w-2 h-2 bg-[#5C1B10] rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <span className="font-ds-body text-[#020B0A]">
                              <strong>Appreciation Outlook:</strong> Expected value growth trajectory shows <strong>{selectedProperty.analysis.marketAnalysis.appreciation}</strong> potential based on market trends and fundamentals.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Market Trend Summary */}
                      <div className="mt-4 p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-[#5C1B10] mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-ds-body font-medium text-[#020B0A] mb-1">Market Trend: {selectedProperty.analysis.marketAnalysis.marketTrend}</div>
                            <div className="text-sm font-ds-body text-[#020B0A] opacity-80">
                              This property is positioned in a <strong>{selectedProperty.analysis.marketAnalysis.marketTrend}</strong> market with <strong>{selectedProperty.analysis.marketAnalysis.demandLevel}</strong> buyer demand. 
                              Current pricing appears <strong>{selectedProperty.analysis.marketAnalysis.pricePerSqftComparison}</strong> relative to comparable properties in the area.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              </div>
            );
          })()}
          
          {comparables && selectedProperty && (
            <div className="space-y-6">
              {/* Comparables Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Comparable Properties Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingComps ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                      <p>Loading comparable properties...</p>
                    </div>
                  ) : comparables.comparables.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-xl font-bold">{formatPrice(comparables.stats.averagePrice)}</div>
                          <div className="text-sm text-gray-600">Avg Comp Price</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-xl font-bold">${comparables.stats.averagePricePerSqft}</div>
                          <div className="text-sm text-gray-600">Avg $/Sq Ft</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="text-xl font-bold">{comparables.comparables.length}</div>
                          <div className="text-sm text-gray-600">Comps Found</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-xl font-bold">{formatPrice(comparables.stats.medianPrice)}</div>
                          <div className="text-sm text-gray-600">Median Price</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {comparables.comparables.slice(0, 5).map((comp: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{comp.address}</h4>
                                  <a
                                    href={`https://www.zillow.com/homes/${encodeURIComponent(comp.address)}_rb/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="View on Zillow"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {comp.bedrooms} bed • {comp.bathrooms} bath • {comp.squareFootage.toLocaleString()} sq ft
                                </p>
                                {comp.soldDate && (
                                  <p className="text-xs text-gray-500">Sold: {new Date(comp.soldDate).toLocaleDateString()}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="flex items-center justify-end gap-1 mb-1">
                                  <div className="font-bold text-lg">{formatPrice(comp.price)}</div>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    comp.priceSource === 'sold' 
                                      ? 'bg-green-100 text-green-800' 
                                      : comp.priceSource === 'estimate'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {comp.priceSource === 'sold' ? 'SOLD' : comp.priceSource === 'estimate' ? 'EST' : 'LIST'}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">${comp.pricePerSqft}/sq ft</div>
                                <div className="text-xs text-gray-500">{comp.distance.toFixed(1)} mi away</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Price Range:</strong> {formatPrice(comparables.stats.priceRange.min)} - {formatPrice(comparables.stats.priceRange.max)}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          <strong>Your Property:</strong> {formatPrice(selectedProperty.data?.price || 0)} 
                          ({selectedProperty.data?.price && comparables.stats.averagePrice ? 
                            `${((selectedProperty.data.price - comparables.stats.averagePrice) / comparables.stats.averagePrice * 100).toFixed(1)}% ${selectedProperty.data.price > comparables.stats.averagePrice ? 'above' : 'below'} average` 
                            : 'N/A'})
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                          <strong>Note:</strong> EST = Recently removed listings (likely sales at estimated prices). 
                          For exact sold prices, check individual Zillow links.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-gray-600 py-8">No comparable properties found in the area.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {!comparables && selectedProperty?.analysis && !showInvestmentScore && (
            <div className="space-y-6">

              {/* Smart Offer Strategy - Now the primary focus */}

              {/* Direct AI Offer Strategy without wrapper card */}
              <StreamlinedOfferStrategy property={selectedProperty} />



              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => window.open(selectedProperty.mlsUrl, '_blank')}
                  className="flex-1 inline-flex items-center justify-center px-5 py-2 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#E5E5E5]"
                  style={{ 
                    boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original Listing
                </button>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="flex-1 inline-flex items-center justify-center px-5 py-2 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#E5E5E5]"
                  style={{ 
                    boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close Analysis
                </button>
              </div>
            </div>
          )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Home className="h-4 w-4" />
            <span>Property Analysis</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI-Powered Property Analysis
          </h1>
          <p className="text-xl text-gray-600">
            Get comprehensive market analysis, value assessments, and investment insights for any property.
          </p>
        </div>

        {/* Add Property Section */}
        <Card className="mb-12 shadow-lg border-2 border-[#D9DADA] bg-[#F2F2F2] rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
              <Plus className="w-6 h-6 mr-3" />
              Add Property to Analyze
            </CardTitle>
            <CardDescription className="font-ds-body text-[#020B0A] opacity-80 leading-[150%]">
              Paste MLS listing URLs from Zillow, Realtor.com, Redfin, or other sites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="url"
                placeholder="https://www.zillow.com/homedetails/..."
                value={newMlsUrl}
                onChange={(e) => setNewMlsUrl(e.target.value)}
                className="flex-1 border-2 border-[#020B0A] rounded px-3 py-2 h-11 placeholder:text-[rgba(2,11,10,0.6)]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddProperty();
                  }
                }}
              />
              <button 
                onClick={handleAddProperty}
                disabled={!newMlsUrl.trim()}
                className="inline-flex items-center justify-center px-6 py-2 bg-[#FAD9D4] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] text-base transition-colors hover:bg-[#F5C7C1] disabled:pointer-events-none disabled:opacity-50"
                style={{ 
                  boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Analyze Property
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-xl text-gray-600">Loading your properties...</p>
          </div>
        ) : properties.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Your Properties ({properties.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <ErrorBoundary key={property.id}>
                  <Card className="shadow-lg border-2 border-[#D9DADA] bg-[#F2F2F2] hover:shadow-xl transition-shadow overflow-hidden rounded-2xl">
                    {/* Hero Image */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                      {property.status === 'analyzed' ? (
                        <>
                          <img 
                            src={property.data?.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges'}
                            alt={property.data?.address || 'Property'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          
                          {/* Recommendation badge temporarily hidden for cleaner design */}
                          {false && property.analysis && (
                            <div className="absolute top-3 left-3">
                              <Badge className={`${getRecommendationColor(property.analysis.recommendation || 'pending')} border shadow-lg`}>
                                {(property.analysis.recommendation || 'PENDING').toUpperCase()}
                              </Badge>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          {property.status === 'pending' ? (
                            <div className="flex flex-col items-center text-gray-500">
                              <Loader2 className="h-8 w-8 animate-spin mb-2" />
                              <span className="text-sm">Analyzing Property...</span>
                            </div>
                          ) : property.status === 'error' ? (
                            <div className="flex flex-col items-center text-red-500">
                              <AlertCircle className="w-8 h-8 mb-2" />
                              <span className="text-sm">Analysis Error</span>
                            </div>
                          ) : (
                            <div className="text-gray-400">
                              <Home className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="absolute top-3 right-3 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshProperty(property)}
                          className="h-8 w-8 p-0 bg-white/20 hover:bg-blue-500/20 backdrop-blur-sm text-white hover:text-blue-500 transition-colors"
                          disabled={property.status === 'pending'}
                        >
                          <RefreshCw className={`w-4 h-4 ${property.status === 'pending' ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProperty(property.id)}
                          className="h-8 w-8 p-0 bg-white/20 hover:bg-red-500/20 backdrop-blur-sm text-white hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-ds-body font-normal text-[#5C1B10] leading-tight">
                        {property.data?.address || 'Analyzing...'}
                      </CardTitle>
                      {property.status === 'analyzed' && property.data && (
                        <div className="flex items-center gap-1 text-sm text-[#020B0A] opacity-70">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {[property.city, property.state, property.zipCode].filter(Boolean).join(', ') || 'Location information loading...'}
                          </span>
                        </div>
                      )}
                      {property.status !== 'analyzed' && (
                        <div className="flex items-center gap-1 text-sm text-[#020B0A] opacity-70">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">Property location loading...</span>
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      {property.status === 'analyzed' && property.data && (
                        <>
                          {/* Price and Square Footage - Side by Side */}
                          <div className="grid grid-cols-2 gap-3 my-6">
                            <div className="text-center">
                              <DollarSign className="h-6 w-6 text-[#5C1B10] mx-auto mb-3" />
                              <div className="text-2xl font-bold text-[#5C1B10] mb-2">
                                {formatPrice(property.data.price)}
                              </div>
                              <div className="text-sm font-ds-body text-[#020B0A]/70">List Price</div>
                            </div>
                            <div className="text-center">
                              <Square className="h-6 w-6 text-[#5C1B10] mx-auto mb-3" />
                              <div className="text-2xl font-bold text-[#5C1B10] mb-2">
                                {property.data.sqft?.toLocaleString() || 'N/A'}
                              </div>
                              <div className="text-sm font-ds-body text-[#020B0A]/70">Sq Ft</div>
                            </div>
                          </div>
                          
                          {/* Bed, Bath, Year Built Grid */}
                          <div className="grid grid-cols-3 gap-3 my-6 text-sm justify-items-center">
                            <div className="flex items-center gap-1">
                              <Bed className="w-4 h-4 text-[#5C1B10]" />
                              <span className="font-ds-body text-[#020B0A] opacity-80">{property.data.bedrooms || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Bath className="w-4 h-4 text-[#5C1B10]" />
                              <span className="font-ds-body text-[#020B0A] opacity-80">{property.data.bathrooms || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Hammer className="w-4 h-4 text-[#5C1B10]" />
                              <span className="font-ds-body text-[#020B0A] opacity-80">{property.data.yearBuilt || 'N/A'}</span>
                            </div>
                          </div>
                          
                          {/* Investment Score - Single Line */}
                          {property.status === 'analyzed' && property.analysis && (
                            <button 
                              onClick={() => {
                                setSelectedProperty(property);
                                setShowInvestmentScore(true);
                              }}
                              className="flex items-center justify-between w-full mb-3 px-6 py-3 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-md hover:bg-[#E5E5E5] transition-colors cursor-pointer"
                              style={{ 
                                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                              }}
                            >
                              <span className="font-medium text-[#020B0A]">Investment Score</span>
                              <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-gray-300 border-2 border-[#020B0A] rounded-sm">
                                  <span className="font-medium text-[#020B0A]">
                                    {property.analysis.investmentScore}/100
                                  </span>
                                </div>
                              </div>
                            </button>
                          )}
                          
                          {/* Show analysis status if missing */}
                          {!property.analysis && (
                            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div className="text-sm text-yellow-800">
                                Analysis data is being processed. Please refresh the page.
                              </div>
                            </div>
                          )}

                          {/* Comparables and Area buttons hidden for streamlined design */}
                          {false && (
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button 
                              className="inline-flex items-center justify-center px-5 py-2 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#E5E5E5] disabled:opacity-50"
                              style={{ 
                                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                              }}
                              onClick={() => fetchComparables(property.id)}
                              disabled={loadingComps === property.id}
                            >
                              {loadingComps === property.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  Comparables
                                </>
                              )}
                            </button>
                            <button 
                              className="inline-flex items-center justify-center px-5 py-2 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#E5E5E5]"
                              style={{ 
                                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                              }}
                              onClick={() => fetchAreaAnalysis(property.id)}
                            >
                              Area
                            </button>
                          </div>
                          )}
                          
                          {/* Main Action Buttons */}
                          <div className="space-y-3">
                            <button 
                              onClick={() => setSelectedProperty(property)}
                              className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#E5E5E5] disabled:pointer-events-none disabled:opacity-50"
                              style={{ 
                                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                              }}
                              disabled={property.status !== 'analyzed'}
                            >
                              <Handshake className="h-5 w-5 mr-2" />
                              Offer Strategy
                            </button>
                            <button 
                              className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#FAD9D4] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#F5C7C1] disabled:pointer-events-none disabled:opacity-50"
                              style={{ 
                                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                              }}
                              onClick={() => property.hasTimeline ? navigateToTimeline(property.id) : createTimeline(property)}
                              disabled={property.status !== 'analyzed' || creatingTimeline === property.id}
                            >
                              {creatingTimeline === property.id ? (
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              ) : property.hasTimeline ? (
                                <Calendar className="h-5 w-5 mr-2" />
                              ) : (
                                <PartyPopper className="h-5 w-5 mr-2" />
                              )}
                              {creatingTimeline === property.id ? 'Creating Timeline...' : 
                               property.hasTimeline ? 'View Timeline' : 'Accepted Offer → Start Timeline'}
                            </button>
                          </div>
                        </>
                      )}
                      
                      {property.status === 'pending' && (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-[#5C1B10]" />
                          <p className="font-ds-body text-[#020B0A] opacity-80">Analyzing property...</p>
                        </div>
                      )}
                      
                      {property.status === 'error' && (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-[#D32F2F]" />
                          <p className="font-ds-body text-[#020B0A] opacity-80 mb-3">Analysis failed</p>
                          <button 
                            onClick={() => analyzeProperty(property)}
                            className="inline-flex items-center justify-center px-6 py-3 bg-[#FAD9D4] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#F5C7C1]"
                            style={{ 
                              boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                            }}
                          >
                            Retry Analysis
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ErrorBoundary>
              ))}
            </div>
          </>
        ) : (
          <Card className="text-center py-16 shadow-lg border-2 border-[#D9DADA] bg-[#F2F2F2] rounded-2xl">
            <CardContent>
              <Home className="h-20 w-20 mx-auto mb-6 text-[#5C1B10] opacity-60" />
              <h3 className="text-2xl font-ds-heading text-[#5C1B10] mb-2 tracking-[-0.01em]">
                No Properties Yet
              </h3>
              <p className="text-xl font-ds-body text-[#020B0A] opacity-80 leading-[150%]">
                Add your first property above to get started with AI-powered analysis
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <AppFooter />
    </div>
  );
}