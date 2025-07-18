"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, TrendingUp, DollarSign, MapPin, Square, Bed, Bath, AlertCircle, Loader2, X, ExternalLink, Users, Trash2, RefreshCw, Hammer, PartyPopper, Handshake, Calendar } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppNavigation from "@/components/app-navigation";

interface Property {
  id: string;
  mlsUrl: string;
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
  
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`;
  } else {
    return `$${price.toLocaleString()}`;
  }
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

export default function PropertyAnalysisPage() {
  const { user } = useUser();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [newMlsUrl, setNewMlsUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [comparables, setComparables] = useState<any>(null);
  const [loadingComps, setLoadingComps] = useState<string | null>(null); // Track which property ID is loading
  const [areaData, setAreaData] = useState<any>(null);
  const [showInvestmentScore, setShowInvestmentScore] = useState(false);
  const [activeOfferTab, setActiveOfferTab] = useState<'strategy' | 'wizard' | 'education'>('strategy');
  const [activeModalTab, setActiveModalTab] = useState<'market' | 'offers'>('market');
  const [wizardData, setWizardData] = useState({
    maxBudget: '',
    preferredPrice: '',
    downPayment: '',
    closingTimeline: '30 days',
    moveInFlexibility: 'Need immediate possession',
    contingencies: {
      inspection: true,
      financing: true,
      appraisal: true,
      saleOfHome: false
    }
  });
  const [customStrategy, setCustomStrategy] = useState<string | null>(null);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [creatingTimeline, setCreatingTimeline] = useState<string | null>(null);

  // Load user's properties
  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user]);

  // Auto-populate wizard data when switching to wizard tab
  useEffect(() => {
    if (activeOfferTab === 'wizard' && selectedProperty && !wizardData.maxBudget) {
      setWizardData(prev => ({
        ...prev,
        maxBudget: selectedProperty.data?.price?.toString() || ''
      }));
    }
  }, [activeOfferTab, selectedProperty]);

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
      console.error('Error loading properties:', error);
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
        alert(result.message);
        setNewMlsUrl("");
        return;
      }
      
      const newProperty: Property = {
        id: result.property.id,
        mlsUrl: newMlsUrl.trim(),
        status: 'pending'
      };
      
      setProperties(prev => [...prev, newProperty]);
      setNewMlsUrl("");
      
      analyzeProperty(newProperty);
    } catch (error) {
      console.error('❌ Failed to add property:', error);
      alert(`Error: ${(error as Error).message}`);
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
      console.error('❌ Analysis error:', error);
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
    if (!confirm('Are you sure you want to delete this property? This will remove it from your dashboard but preserve the analysis data.')) {
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
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('Failed to delete property. Please try again.');
    }
  };

  const refreshProperty = async (property: Property) => {
    if (!confirm('This will refresh the property data and re-run AI analysis. Continue?')) {
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
      console.error('❌ Refresh error:', error);
      alert('Failed to refresh property. Please try again.');
      
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

  const generateCustomStrategy = async () => {
    
    if (!selectedProperty) {
      console.error('No property selected');
      return;
    }
    
    setGeneratingStrategy(true);
    try {
      const contingencyList = Object.entries(wizardData.contingencies)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key.replace(/([A-Z])/g, ' $1').toLowerCase());
      
      const response = await fetch('/api/custom-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property: selectedProperty.data,
          budget: {
            max: parseFloat(wizardData.maxBudget) || 0,
            preferred: parseFloat(wizardData.preferredPrice) || 0,
            downPayment: parseFloat(wizardData.downPayment) || 0
          },
          timeline: {
            closing: wizardData.closingTimeline,
            moveIn: wizardData.moveInFlexibility
          },
          contingencies: contingencyList,
          analysis: selectedProperty.analysis, // Pass the full property analysis
          comparables: comparables // Pass comparable sales data if available
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomStrategy(data.strategy);
      } else {
        console.error('Failed to generate custom strategy');
        setCustomStrategy('Unable to generate custom strategy at this time. Please try again later.');
      }
    } catch (error) {
      console.error('Error generating strategy:', error);
      setCustomStrategy('Unable to generate custom strategy at this time. Please try again later.');
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const createTimeline = async (property: Property) => {
    if (!property.data) {
      console.error('Property data not available');
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
      console.error('Error creating timeline:', error);
      // You could add a toast notification here for better UX
      alert(error instanceof Error ? error.message : 'Failed to create timeline. Please try again.');
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
      console.error('Error checking timeline:', response.status, response.statusText);
      return false;
    } catch (error) {
      console.error('Error checking timeline:', error);
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
      console.error('Error fetching comparables:', error);
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
      console.error('Error fetching area analysis:', error);
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
      {/* Full Analysis Modal */}
      {!!selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => {
              setSelectedProperty(null);
              setComparables(null);
              setAreaData(null);
              setShowInvestmentScore(false);
            }}
          />
          <div className="relative z-50 w-full max-w-4xl mx-8">
            <div className="bg-[#F2F2F2] border-2 border-[#020B0A] rounded-2xl shadow-xl max-h-[85vh] overflow-hidden">
              <div 
                className="p-6 w-full max-h-[85vh] overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#5C1B10 #D9DADA'
                }}
              >
              {!showInvestmentScore && (
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
                      {selectedProperty?.data?.address || 'Property Analysis'}
                    </h2>
                    <p className="font-ds-body text-[#020B0A] opacity-80 leading-[150%]">
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
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
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
                      <h2 className="text-2xl font-ds-heading text-[#5C1B10] tracking-[-0.01em] mb-1">Investment Score Analysis</h2>
                      <h3 className="text-lg font-ds-heading text-[#5C1B10] tracking-[-0.01em] mb-1">{selectedProperty?.data?.address}</h3>
                      <p className="font-ds-body text-[#020B0A] opacity-80 leading-[150%]">Detailed breakdown of factors affecting this property's investment potential</p>
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
          
          {showInvestmentScore && selectedProperty?.analysis && (
            <div className="space-y-6">

              {/* Score Breakdown */}
              <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-ds-heading text-[#5C1B10] tracking-[-0.01em]">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Market Pricing */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Market Pricing</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">18/20</span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div className="bg-[#5C1B10] h-3 rounded-full" style={{width: '90%'}}></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">Competitively priced for the area</p>
                    </div>

                    {/* Property Condition */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Property Condition</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">14/15</span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div className="bg-[#5C1B10] h-3 rounded-full" style={{width: '93%'}}></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">Excellent condition for age</p>
                    </div>

                    {/* Location Value */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Location Value</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">16/20</span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div className="bg-[#5C1B10] h-3 rounded-full" style={{width: '80%'}}></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">Strong neighborhood fundamentals</p>
                    </div>

                    {/* Cash Flow Potential */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-ds-body font-medium text-[#020B0A]">Cash Flow Potential</span>
                        <span className="font-ds-body font-bold text-[#5C1B10]">12/15</span>
                      </div>
                      <div className="w-full bg-[#D9DADA] rounded-full h-3">
                        <div className="bg-[#5C1B10] h-3 rounded-full" style={{width: '80%'}}></div>
                      </div>
                      <p className="text-sm font-ds-body text-[#020B0A] opacity-70">Moderate rental yield expected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Positive Factors */}
              <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-base font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Key Positive Factors
                  </CardTitle>
                </CardHeader>
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
              </Card>

              {/* Red Flags & Concerns */}
              {selectedProperty.analysis.redFlags.length > 0 && (
                <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Red Flags & Concerns
                    </CardTitle>
                  </CardHeader>
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
                </Card>
              )}

              {/* Market Context */}
              <Card className="shadow-lg border-2 border-[#D9DADA] bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-base font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
                    <TrendingUp className="h-5 w-5 mr-2 text-[#5C1B10]" />
                    Market Context & Trends
                  </CardTitle>
                </CardHeader>
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
              </Card>
            </div>
          )}
          
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

              {/* Main Modal Tabs */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => {
                    setActiveModalTab('market');
                    setCustomStrategy(null);
                  }}
                  className={`flex-1 inline-flex items-center justify-center px-5 py-2 border-2 border-[#020B0A] rounded-md font-medium transition-colors ${
                    activeModalTab === 'market'
                      ? 'bg-[#020B0A] text-[#F2F2F2]'
                      : 'bg-[#F2F2F2] text-[#020B0A] hover:bg-[#E5E5E5]'
                  }`}
                  style={{ 
                    boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Market Analysis by Sarah
                </button>
                <button
                  onClick={() => {
                    setActiveModalTab('offers');
                  }}
                  className={`flex-1 inline-flex items-center justify-center px-5 py-2 border-2 border-[#020B0A] rounded-md font-medium transition-colors ${
                    activeModalTab === 'offers'
                      ? 'bg-[#020B0A] text-[#F2F2F2]'
                      : 'bg-[#F2F2F2] text-[#020B0A] hover:bg-[#E5E5E5]'
                  }`}
                  style={{ 
                    boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                  }}
                >
                  <Handshake className="h-4 w-4 mr-2" />
                  Smart Offer Strategy
                </button>
              </div>

              {/* Market Analysis Tab */}
              {activeModalTab === 'market' && (
                <Card className="shadow-lg border-2 border-[#D9DADA] bg-[#F2F2F2] rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
                    <TrendingUp className="h-5 w-5 mr-2 text-[#5C1B10]" />
                    Market Analysis by Sarah Chen
                  </CardTitle>
                  <CardDescription className="font-ds-body text-[#020B0A] opacity-80 leading-[150%]">
                    Local market insights and property valuation analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Market Value Range */}
                  <div>
                    <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-3">Market Value Range</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <div className="text-xl font-bold font-ds-body text-[#5C1B10]">
                          {formatPrice(selectedProperty.analysis.marketValue.low)}
                        </div>
                        <div className="text-sm font-ds-body text-[#020B0A] opacity-80">Conservative Est.</div>
                      </div>
                      <div className="text-center p-4 bg-[#5C1B10] border-2 border-[#020B0A] rounded-2xl shadow-lg">
                        <div className="text-xl font-bold font-ds-body text-[#F2F2F2]">
                          {formatPrice(selectedProperty.analysis.marketValue.estimated)}
                        </div>
                        <div className="text-sm font-ds-body text-[#FAD9D4]">Fair Market Value</div>
                      </div>
                      <div className="text-center p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <div className="text-xl font-bold font-ds-body text-[#5C1B10]">
                          {formatPrice(selectedProperty.analysis.marketValue.high)}
                        </div>
                        <div className="text-sm font-ds-body text-[#020B0A] opacity-80">Optimistic Est.</div>
                      </div>
                    </div>
                  </div>

                  {/* Market Insights Grid */}
                  <div>
                    <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-3">Market Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-[#5C1B10]" />
                          <span className="font-medium font-ds-heading text-[#5C1B10]">Price Trend</span>
                        </div>
                        <div className="text-sm font-ds-body text-[#020B0A] opacity-80">
                          {selectedProperty.analysis.marketAnalysis.pricePerSqftComparison.charAt(0).toUpperCase() + selectedProperty.analysis.marketAnalysis.pricePerSqftComparison.slice(1)}
                        </div>
                        <div className="text-lg font-bold font-ds-body text-[#5C1B10] mt-1 capitalize">
                          {selectedProperty.analysis.marketAnalysis.marketTrend}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-[#5C1B10]" />
                          <span className="font-medium font-ds-heading text-[#5C1B10]">Demand Level</span>
                        </div>
                        <div className="text-sm font-ds-body text-[#020B0A] opacity-80">
                          Current buyer interest
                        </div>
                        <div className="text-lg font-bold font-ds-body text-[#5C1B10] mt-1 capitalize">
                          {selectedProperty.analysis.marketAnalysis.demandLevel}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="h-4 w-4 text-[#5C1B10]" />
                          <span className="font-medium font-ds-heading text-[#5C1B10]">Price Comparison</span>
                        </div>
                        <div className="text-sm font-ds-body text-[#020B0A] opacity-80">
                          vs. comparable properties
                        </div>
                        <div className="text-lg font-bold font-ds-body text-[#5C1B10] mt-1 capitalize">
                          {selectedProperty.analysis.marketAnalysis.pricePerSqftComparison}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-[#5C1B10]" />
                          <span className="font-medium font-ds-heading text-[#5C1B10]">Appreciation</span>
                        </div>
                        <div className="text-sm font-ds-body text-[#020B0A] opacity-80">
                          Expected growth potential
                        </div>
                        <div className="text-lg font-bold font-ds-body text-[#5C1B10] mt-1 capitalize">
                          {selectedProperty.analysis.marketAnalysis.appreciation}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sarah's Assessment */}
                  <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <h3 className="font-semibold font-ds-heading text-[#5C1B10]">Sarah's Assessment</h3>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-ds-body text-[#020B0A] opacity-70">Confidence Level</div>
                          <div className="text-lg font-bold font-ds-body text-[#5C1B10]">
                            {selectedProperty.analysis.aiConfidence}%
                          </div>
                        </div>
                        <Badge className={`${getRecommendationColor(selectedProperty.analysis.recommendation)} border font-ds-body font-medium px-3 py-1`}>
                          {selectedProperty.analysis.recommendation.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm font-ds-body text-[#020B0A] leading-relaxed">
                      {selectedProperty.analysis.analysis}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-xl">
                      <div className="text-lg font-bold font-ds-body text-[#5C1B10]">
                        ${Math.round(selectedProperty.data?.pricePerSqft || ((selectedProperty.data?.price || 0) / (selectedProperty.data?.sqft || 1))).toLocaleString()}
                      </div>
                      <div className="text-xs font-ds-body text-[#020B0A] opacity-70">Per Sq Ft</div>
                    </div>
                    <div className="text-center p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-xl">
                      <div className="text-lg font-bold font-ds-body text-[#5C1B10]">
                        {selectedProperty.data?.daysOnMarket || 'New'}
                      </div>
                      <div className="text-xs font-ds-body text-[#020B0A] opacity-70">Days on Market</div>
                    </div>
                    <div className="text-center p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-xl">
                      <div className="text-lg font-bold font-ds-body text-[#5C1B10]">
                        {selectedProperty.data?.yearBuilt || 'Unknown'}
                      </div>
                      <div className="text-xs font-ds-body text-[#020B0A] opacity-70">Year Built</div>
                    </div>
                    <div className="text-center p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-xl">
                      <div className="text-lg font-bold font-ds-body text-[#5C1B10]">
                        {selectedProperty.data?.sqft?.toLocaleString() || 'Unknown'}
                      </div>
                      <div className="text-xs font-ds-body text-[#020B0A] opacity-70">Square Feet</div>
                    </div>
                  </div>

                </CardContent>
              </Card>
              )}

              {/* Offer Strategy Tab */}
              {activeModalTab === 'offers' && (
              <Card className="shadow-lg border-2 border-[#D9DADA] bg-[#F2F2F2] rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-ds-heading text-[#5C1B10] tracking-[-0.01em]">
                    <Handshake className="h-5 w-5 mr-2 text-[#5C1B10]" />
                    Smart Offer Strategy by Sarah Chen
                  </CardTitle>
                  <CardDescription className="font-ds-body text-[#020B0A] opacity-80 leading-[150%]">
                    Local expert insights to help you understand offer components and build winning strategies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tab Navigation */}
                  <div className="flex space-x-1 mb-6 bg-[#D9DADA] p-1 rounded-2xl border-2 border-[#020B0A]">
                    <button
                      onClick={() => {
                        setActiveOfferTab('strategy');
                        setCustomStrategy(null);
                      }}
                      className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium font-ds-body transition-colors ${
                        activeOfferTab === 'strategy'
                          ? 'bg-[#FAD9D4] text-[#5C1B10] border-2 border-[#020B0A] shadow-md'
                          : 'text-[#020B0A] hover:bg-[#F2F2F2] hover:text-[#5C1B10]'
                      }`}
                    >
                      AI Strategy
                    </button>
                    <button
                      onClick={() => setActiveOfferTab('wizard')}
                      className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium font-ds-body transition-colors ${
                        activeOfferTab === 'wizard'
                          ? 'bg-[#FAD9D4] text-[#5C1B10] border-2 border-[#020B0A] shadow-md'
                          : 'text-[#020B0A] hover:bg-[#F2F2F2] hover:text-[#5C1B10]'
                      }`}
                    >
                      Offer Wizard
                    </button>
                    <button
                      onClick={() => setActiveOfferTab('education')}
                      className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium font-ds-body transition-colors ${
                        activeOfferTab === 'education'
                          ? 'bg-[#FAD9D4] text-[#5C1B10] border-2 border-[#020B0A] shadow-md'
                          : 'text-[#020B0A] hover:bg-[#F2F2F2] hover:text-[#5C1B10]'
                      }`}
                    >
                      Learn More
                    </button>
                  </div>

                  {/* AI Strategy Tab */}
                  {activeOfferTab === 'strategy' && (
                    <div className="space-y-6">
                      
                      {/* Suggested Offer Range */}
                      <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-2">Sarah's Suggested Offer Range</h3>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-lg font-bold font-ds-body text-[#5C1B10]">
                              {formatPrice(selectedProperty.analysis.negotiationStrategy.suggestedOffer * 0.95)}
                            </div>
                            <div className="text-sm font-ds-body text-[#020B0A] opacity-80">Conservative</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold font-ds-body text-[#5C1B10]">
                              {formatPrice(selectedProperty.analysis.negotiationStrategy.suggestedOffer)}
                            </div>
                            <div className="text-sm font-ds-body text-[#020B0A] opacity-80">Recommended</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold font-ds-body text-[#5C1B10]">
                              {formatPrice(selectedProperty.analysis.negotiationStrategy.suggestedOffer * 1.05)}
                            </div>
                            <div className="text-sm font-ds-body text-[#020B0A] opacity-80">Aggressive</div>
                          </div>
                        </div>
                      </div>

                      {/* Negotiation Tactics */}
                      <div>
                        <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-3">Local Market Tactics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedProperty.analysis.negotiationStrategy.tactics.map((tactic, index) => (
                            <div key={index} className="flex items-start gap-2 p-3 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                              <div className="w-2 h-2 bg-[#5C1B10] rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm font-ds-body text-[#020B0A]">{tactic}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Your Leverage Points */}
                      <div>
                        <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-3">Your Leverage Points</h3>
                        <div className="space-y-2">
                          {selectedProperty.analysis.negotiationStrategy.leverage.map((point, index) => (
                            <div key={index} className="flex items-start gap-2 p-3 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                              <div className="w-2 h-2 bg-[#5C1B10] rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm font-ds-body text-[#020B0A]">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Offer Wizard Tab */}
                  {activeOfferTab === 'wizard' && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold font-ds-heading text-[#5C1B10] mb-2">Interactive Offer Strategy Wizard</h3>
                        <p className="text-sm font-ds-body text-[#020B0A] opacity-80">Answer these questions to get personalized offer guidance</p>
                      </div>

                      {/* Step 1: Budget */}
                      <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-3">Step 1: Your Budget</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium font-ds-body text-[#020B0A] mb-1">Maximum you can afford</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#020B0A] font-ds-body">$</span>
                              <input
                                type="text"
                                placeholder="e.g., 800,000"
                                value={wizardData.maxBudget ? Number(wizardData.maxBudget).toLocaleString() : ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  setWizardData({...wizardData, maxBudget: value});
                                }}
                                className="w-full p-2 pl-8 border-2 border-[#D9DADA] rounded-xl bg-[#F2F2F2] text-[#020B0A] font-ds-body focus:border-[#5C1B10] focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium font-ds-body text-[#020B0A] mb-1">Preferred offer price</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#020B0A] font-ds-body">$</span>
                              <input
                                type="text"
                                placeholder="e.g., 750,000"
                                value={wizardData.preferredPrice ? Number(wizardData.preferredPrice).toLocaleString() : ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  setWizardData(prev => ({
                                    ...prev,
                                    preferredPrice: value,
                                    // Auto-calculate 20% down payment when preferred price changes
                                    downPayment: value ? Math.round(Number(value) * 0.2).toString() : ''
                                  }));
                                }}
                                className="w-full p-2 pl-8 pr-52 border-2 border-[#D9DADA] rounded-xl bg-[#F2F2F2] text-[#020B0A] font-ds-body focus:border-[#5C1B10] focus:outline-none"
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const maxBudget = Number(wizardData.maxBudget);
                                    if (maxBudget) {
                                      const preferredPrice = Math.round(maxBudget * 0.85).toString();
                                      setWizardData(prev => ({
                                        ...prev,
                                        preferredPrice: preferredPrice,
                                        downPayment: Math.round(Number(preferredPrice) * 0.2).toString()
                                      }));
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  85%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const maxBudget = Number(wizardData.maxBudget);
                                    if (maxBudget) {
                                      const preferredPrice = Math.round(maxBudget * 0.9).toString();
                                      setWizardData(prev => ({
                                        ...prev,
                                        preferredPrice: preferredPrice,
                                        downPayment: Math.round(Number(preferredPrice) * 0.2).toString()
                                      }));
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  90%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const maxBudget = Number(wizardData.maxBudget);
                                    if (maxBudget) {
                                      const preferredPrice = Math.round(maxBudget * 0.95).toString();
                                      setWizardData(prev => ({
                                        ...prev,
                                        preferredPrice: preferredPrice,
                                        downPayment: Math.round(Number(preferredPrice) * 0.2).toString()
                                      }));
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  95%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const maxBudget = Number(wizardData.maxBudget);
                                    if (maxBudget) {
                                      const preferredPrice = maxBudget.toString();
                                      setWizardData(prev => ({
                                        ...prev,
                                        preferredPrice: preferredPrice,
                                        downPayment: Math.round(Number(preferredPrice) * 0.2).toString()
                                      }));
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  100%
                                </button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium font-ds-body text-[#020B0A] mb-1">Down payment available</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#020B0A] font-ds-body">$</span>
                              <input
                                type="text"
                                placeholder="e.g., 150,000"
                                value={wizardData.downPayment ? Number(wizardData.downPayment).toLocaleString() : ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  setWizardData({...wizardData, downPayment: value});
                                }}
                                className="w-full p-2 pl-8 pr-44 border-2 border-[#D9DADA] rounded-xl bg-[#F2F2F2] text-[#020B0A] font-ds-body focus:border-[#5C1B10] focus:outline-none"
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const preferred = Number(wizardData.preferredPrice);
                                    if (preferred) {
                                      setWizardData({...wizardData, downPayment: Math.round(preferred * 0.1).toString()});
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  10%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const preferred = Number(wizardData.preferredPrice);
                                    if (preferred) {
                                      setWizardData({...wizardData, downPayment: Math.round(preferred * 0.15).toString()});
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  15%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const preferred = Number(wizardData.preferredPrice);
                                    if (preferred) {
                                      setWizardData({...wizardData, downPayment: Math.round(preferred * 0.2).toString()});
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  20%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const preferred = Number(wizardData.preferredPrice);
                                    if (preferred) {
                                      setWizardData({...wizardData, downPayment: Math.round(preferred * 0.25).toString()});
                                    }
                                  }}
                                  className="py-1 px-2 text-xs font-ds-body bg-[#FAD9D4] border border-[#D9DADA] rounded-lg hover:bg-[#5C1B10] hover:text-[#F2F2F2] transition-colors"
                                >
                                  25%
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Timeline */}
                      <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-3">Step 2: Your Timeline</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium font-ds-body text-[#020B0A] mb-1">Preferred closing date</label>
                            <select 
                              value={wizardData.closingTimeline}
                              onChange={(e) => setWizardData({...wizardData, closingTimeline: e.target.value})}
                              className="w-full p-2 border-2 border-[#D9DADA] rounded-xl bg-[#FAD9D4] text-[#020B0A] font-ds-body focus:border-[#5C1B10] focus:outline-none"
                            >
                              <option>30 days</option>
                              <option>45 days</option>
                              <option>60 days</option>
                              <option>Flexible</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium font-ds-body text-[#020B0A] mb-1">Move-in flexibility</label>
                            <select 
                              value={wizardData.moveInFlexibility}
                              onChange={(e) => setWizardData({...wizardData, moveInFlexibility: e.target.value})}
                              className="w-full p-2 border-2 border-[#D9DADA] rounded-xl bg-[#FAD9D4] text-[#020B0A] font-ds-body focus:border-[#5C1B10] focus:outline-none"
                            >
                              <option>Need immediate possession</option>
                              <option>Can wait 30 days</option>
                              <option>Can offer rent-back to seller</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Contingencies */}
                      <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                        <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-3">Step 3: Contingencies</h4>
                        <div className="space-y-3">
                          <label className="flex items-center cursor-pointer group">
                            <div className="relative mr-3">
                              <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={wizardData.contingencies.inspection}
                                onChange={(e) => setWizardData({...wizardData, contingencies: {...wizardData.contingencies, inspection: e.target.checked}})}
                              />
                              <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                                wizardData.contingencies.inspection 
                                  ? 'bg-[#5C1B10] border-[#5C1B10]' 
                                  : 'bg-[#F2F2F2] border-[#D9DADA] group-hover:border-[#5C1B10]'
                              }`}>
                                {wizardData.contingencies.inspection && (
                                  <svg className="w-4 h-4 text-[#F2F2F2] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 20 20" strokeWidth="2">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-ds-body text-[#020B0A] group-hover:text-[#5C1B10] transition-colors">Inspection contingency (recommended)</span>
                          </label>
                          <label className="flex items-center cursor-pointer group">
                            <div className="relative mr-3">
                              <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={wizardData.contingencies.financing}
                                onChange={(e) => setWizardData({...wizardData, contingencies: {...wizardData.contingencies, financing: e.target.checked}})}
                              />
                              <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                                wizardData.contingencies.financing 
                                  ? 'bg-[#5C1B10] border-[#5C1B10]' 
                                  : 'bg-[#F2F2F2] border-[#D9DADA] group-hover:border-[#5C1B10]'
                              }`}>
                                {wizardData.contingencies.financing && (
                                  <svg className="w-4 h-4 text-[#F2F2F2] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 20 20" strokeWidth="2">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-ds-body text-[#020B0A] group-hover:text-[#5C1B10] transition-colors">Financing contingency</span>
                          </label>
                          <label className="flex items-center cursor-pointer group">
                            <div className="relative mr-3">
                              <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={wizardData.contingencies.appraisal}
                                onChange={(e) => setWizardData({...wizardData, contingencies: {...wizardData.contingencies, appraisal: e.target.checked}})}
                              />
                              <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                                wizardData.contingencies.appraisal 
                                  ? 'bg-[#5C1B10] border-[#5C1B10]' 
                                  : 'bg-[#F2F2F2] border-[#D9DADA] group-hover:border-[#5C1B10]'
                              }`}>
                                {wizardData.contingencies.appraisal && (
                                  <svg className="w-4 h-4 text-[#F2F2F2] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 20 20" strokeWidth="2">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-ds-body text-[#020B0A] group-hover:text-[#5C1B10] transition-colors">Appraisal contingency</span>
                          </label>
                          <label className="flex items-center cursor-pointer group">
                            <div className="relative mr-3">
                              <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={wizardData.contingencies.saleOfHome}
                                onChange={(e) => setWizardData({...wizardData, contingencies: {...wizardData.contingencies, saleOfHome: e.target.checked}})}
                              />
                              <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                                wizardData.contingencies.saleOfHome 
                                  ? 'bg-[#5C1B10] border-[#5C1B10]' 
                                  : 'bg-[#F2F2F2] border-[#D9DADA] group-hover:border-[#5C1B10]'
                              }`}>
                                {wizardData.contingencies.saleOfHome && (
                                  <svg className="w-4 h-4 text-[#F2F2F2] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 20 20" strokeWidth="2">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-ds-body text-[#020B0A] group-hover:text-[#5C1B10] transition-colors">Sale of current home contingency</span>
                          </label>
                        </div>
                      </div>

                      {/* Generate Strategy Button */}
                      <div className="text-center">
                        <button 
                          type="button"
                          onClick={generateCustomStrategy}
                          disabled={generatingStrategy || !wizardData.maxBudget || !wizardData.preferredPrice}
                          className="px-8 py-4 bg-[#5C1B10] text-[#F2F2F2] rounded-2xl border-2 border-[#020B0A] hover:bg-[#020B0A] hover:text-[#FAD9D4] transition-all duration-200 font-ds-body font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-base"
                        >
                          {generatingStrategy && <Loader2 className="h-4 w-4 animate-spin" />}
                          {generatingStrategy ? 'Generating Strategy...' : 'Generate My Custom Strategy'}
                        </button>
                      </div>
                      
                      {/* Custom Strategy Results */}
                      {customStrategy && (
                        <div className="mt-6 p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                          <h4 className="font-semibold font-ds-heading text-[#5C1B10] mb-3 flex items-center">
                            <PartyPopper className="h-4 w-4 mr-2" />
                            Your Custom Offer Strategy
                          </h4>
                          <div className="text-sm font-ds-body text-[#020B0A] whitespace-pre-wrap leading-relaxed">
                            {customStrategy}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Education Tab */}
                  {activeOfferTab === 'education' && (
                    <div className="space-y-6">
                      
                      {/* Educational Components */}
                      <div>
                        <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-4">Understanding Offer Components</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-2">Price Strategy</h4>
                            <p className="text-sm font-ds-body text-[#020B0A] opacity-80 mb-2">Your offer price should reflect market conditions, comparable sales, and property condition</p>
                            <ul className="text-xs font-ds-body text-[#020B0A] opacity-70 space-y-1">
                              <li>• Research comparable sales in the area</li>
                              <li>• Consider days on market</li>
                              <li>• Factor in property condition</li>
                            </ul>
                          </div>
                          <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-2">Contingencies</h4>
                            <p className="text-sm font-ds-body text-[#020B0A] opacity-80 mb-2">Inspection, financing, and appraisal contingencies protect your interests</p>
                            <ul className="text-xs font-ds-body text-[#020B0A] opacity-70 space-y-1">
                              <li>• Inspection: 7-10 days typical</li>
                              <li>• Financing: 30-45 days</li>
                              <li>• Appraisal: Usually part of financing</li>
                            </ul>
                          </div>
                          <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-2">Timeline</h4>
                            <p className="text-sm font-ds-body text-[#020B0A] opacity-80 mb-2">Closing dates and possession terms can be negotiating tools</p>
                            <ul className="text-xs font-ds-body text-[#020B0A] opacity-70 space-y-1">
                              <li>• Quick close = competitive advantage</li>
                              <li>• Flexible move-in = seller convenience</li>
                              <li>• Rent-back = helps motivated sellers</li>
                            </ul>
                          </div>
                          <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-2">Financing</h4>
                            <p className="text-sm font-ds-body text-[#020B0A] opacity-80 mb-2">Pre-approval strength and down payment can make offers more attractive</p>
                            <ul className="text-xs font-ds-body text-[#020B0A] opacity-70 space-y-1">
                              <li>• Pre-approval &gt; pre-qualification</li>
                              <li>• Larger down payment = stronger offer</li>
                              <li>• Cash offers win in competitive markets</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Advanced Topics */}
                      <div className="pt-4 border-t-2 border-[#D9DADA]">
                        <h3 className="font-semibold font-ds-heading text-[#5C1B10] mb-4">Advanced Offer Strategies</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-2">Escalation Clauses</h4>
                            <p className="text-sm font-ds-body text-[#020B0A] opacity-80">Automatically increase your offer up to a maximum if competing offers are received</p>
                          </div>
                          <div className="p-4 bg-[#F2F2F2] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-2">Personal Letters</h4>
                            <p className="text-sm font-ds-body text-[#020B0A] opacity-80">Connect with sellers emotionally, but use carefully and legally</p>
                          </div>
                          <div className="p-4 bg-[#FAD9D4] border-2 border-[#D9DADA] rounded-2xl shadow-lg">
                            <h4 className="font-medium font-ds-heading text-[#5C1B10] mb-2">Waiving Contingencies</h4>
                            <p className="text-sm font-ds-body text-[#020B0A] opacity-80">Can make offers more competitive but increases risk significantly</p>
                          </div>
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

                </CardContent>
              </Card>
              )}

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
                      {property.status === 'analyzed' && property.data?.images?.[0] ? (
                        <>
                          <img 
                            src={property.data.images[0]}
                            alt={property.data.address}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          
                          {property.analysis && (
                            <div className="absolute top-3 left-3">
                              <Badge className={`${getRecommendationColor(property.analysis.recommendation)} border shadow-lg`}>
                                {property.analysis.recommendation.toUpperCase()}
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
                      <div className="flex items-center gap-1 text-sm text-[#020B0A] opacity-70">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{property.mlsUrl}</span>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {property.status === 'analyzed' && property.data && (
                        <>
                          {/* Price and Square Footage - Side by Side */}
                          <div className="grid grid-cols-2 gap-6 my-6">
                            <div className="text-center">
                              <DollarSign className="h-6 w-6 text-[#5C1B10] mx-auto mb-3" />
                              <div className="text-2xl font-bold text-[#5C1B10] tracking-[0.05em] mb-2">
                                {formatPrice(property.data.price)}
                              </div>
                              <div className="text-sm font-ds-body text-[#020B0A]/70">List Price</div>
                            </div>
                            <div className="text-center">
                              <Square className="h-6 w-6 text-[#5C1B10] mx-auto mb-3" />
                              <div className="text-2xl font-bold text-[#5C1B10] tracking-[0.05em] mb-2">
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
                              className="flex items-center justify-between w-full mb-4 px-6 py-3 bg-[#FAD9D4] border-2 border-[#020B0A] rounded-md hover:bg-[#F5C7C1] transition-colors cursor-pointer"
                              style={{ 
                                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                              }}
                            >
                              <span className="font-medium text-[#020B0A]">Investment Score</span>
                              <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-sm">
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

                          {/* Action Buttons Grid */}
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
                                'Comparables'
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
                          
                          {/* Main Action Buttons */}
                          <div className="space-y-3">
                            <button 
                              onClick={() => setSelectedProperty(property)}
                              className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#FAD9D4] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#F5C7C1] disabled:pointer-events-none disabled:opacity-50"
                              style={{ 
                                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                              }}
                              disabled={property.status !== 'analyzed'}
                            >
                              <Handshake className="h-5 w-5 mr-2" />
                              Offer Strategy
                            </button>
                            <button 
                              className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#F2F2F2] border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-[#E5E5E5] disabled:pointer-events-none disabled:opacity-50"
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
    </div>
  );
}