"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Search, Database, DollarSign, ArrowLeft, Eye, EyeOff, Copy, Check, Brain, Sparkles } from "lucide-react";

interface PropertyLookupResult {
  success: boolean;
  searchInput: {
    address: string;
    zipCode?: string;
  };
  searchResults: Array<{
    searchType: string;
    success: boolean;
    propertiesFound: number;
    estimatedCost: number;
    error?: string;
  }>;
  totalCost: {
    propertiesReturned: number;
    estimatedCost: number;
  };
  propertyData: {
    found: boolean;
    sampleProperty?: any;
    fieldAnalysis?: any;
    allAvailableFields?: any;
  };
}

export default function PropertyLookupPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PropertyLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!address.trim()) {
      setError("Please enter an address");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setAiAnalysis(null);
    setAiError(null);

    try {
      const response = await fetch('/api/admin/property-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, zipCode })
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Admin access required');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Property lookup failed:', err);
      setError('Failed to lookup property');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyField = async (field: string, value: any) => {
    try {
      await navigator.clipboard.writeText(`${field}: ${JSON.stringify(value)}`);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAiAnalysis = async () => {
    if (!result?.propertyData) {
      setAiError('No property data available for analysis');
      return;
    }

    setAnalyzingAI(true);
    setAiError(null);

    try {
      const response = await fetch('/api/admin/deal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyData: result.propertyData,
          searchInput: result.searchInput
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setAiError('Failed to analyze property with Deal Maker AI');
    } finally {
      setAnalyzingAI(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C1B10]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin')}
            className="border-[#D9DADA]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#020B0A]">Property Lookup</h1>
            <p className="text-[#020B0A] opacity-70">Test BatchData API with any address</p>
          </div>
        </div>

        {/* Search Form */}
        <Card className="mb-8 border-[#D9DADA]">
          <CardHeader>
            <CardTitle className="text-[#5C1B10]">Property Search</CardTitle>
            <CardDescription>Enter an address to get comprehensive BatchData property information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Enter property address (e.g., 123 Main St, Los Angeles, CA)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border-[#D9DADA]"
                />
              </div>
              <div>
                <Input
                  placeholder="Zip Code (optional)"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="border-[#D9DADA]"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <Button 
                onClick={handleSearch} 
                disabled={loading}
                className="bg-[#5C1B10] hover:bg-[#5C1B10]/90"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Property
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Search Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="border-[#D9DADA]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm font-medium text-[#020B0A]">
                    <Search className="h-4 w-4 mr-2" />
                    Properties Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#5C1B10]">{result.totalCost.propertiesReturned}</div>
                </CardContent>
              </Card>

              <Card className="border-[#D9DADA]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm font-medium text-[#020B0A]">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Estimated Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#5C1B10]">${result.totalCost.estimatedCost}</div>
                </CardContent>
              </Card>

              <Card className="border-[#D9DADA]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm font-medium text-[#020B0A]">
                    <Database className="h-4 w-4 mr-2" />
                    Data Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#5C1B10]">
                    {result.propertyData.found ? 'Yes' : 'No'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Deal Maker AI Analysis */}
            <Card className="mb-8 border-[#D9DADA]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-[#5C1B10]" />
                    <CardTitle className="text-[#5C1B10]">Deal Maker AI Analysis</CardTitle>
                  </div>
                  <Button
                    onClick={handleAiAnalysis}
                    disabled={analyzingAI || !result.propertyData.found}
                    className="bg-[#5C1B10] hover:bg-[#5C1B10]/90"
                  >
                    {analyzingAI ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze Deal
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  {result.propertyData.found 
                    ? "Get AI-powered investment insights and deal analysis"
                    : "Property data required for AI analysis"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aiError && (
                  <div className="flex items-center text-red-600 mb-4">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {aiError}
                  </div>
                )}
                {aiAnalysis ? (
                  <div className="bg-[#F9F9F9] p-6 rounded-lg border">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-[#020B0A] font-sans">
                        {aiAnalysis}
                      </pre>
                    </div>
                  </div>
                ) : !aiError && (
                  <div className="text-center py-8 text-[#020B0A] opacity-70">
                    {result.propertyData.found 
                      ? "Click \"Analyze Deal\" to get AI-powered investment insights"
                      : "No property data found - unable to perform AI analysis"
                    }
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            <Card className="mb-8 border-[#D9DADA]">
              <CardHeader>
                <CardTitle className="text-[#5C1B10]">Search Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.searchResults.map((searchResult, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-[#D9DADA] rounded-lg">
                      <div>
                        <h4 className="font-medium text-[#020B0A]">{searchResult.searchType}</h4>
                        {searchResult.error && (
                          <p className="text-sm text-red-600">{searchResult.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-[#020B0A]">
                          {searchResult.propertiesFound} properties
                        </span>
                        <span className="text-sm font-semibold text-[#5C1B10]">
                          ${searchResult.estimatedCost.toFixed(2)}
                        </span>
                        <Badge 
                          variant={searchResult.success ? "default" : "destructive"}
                          className={searchResult.success ? "bg-green-100 text-green-800" : ""}
                        >
                          {searchResult.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Property Data */}
            {result.propertyData.found && result.propertyData.fieldAnalysis && (
              <>
                {/* Field Analysis */}
                <Card className="mb-8 border-[#D9DADA]">
                  <CardHeader>
                    <CardTitle className="text-[#5C1B10]">Field Analysis</CardTitle>
                    <CardDescription>Overview of available data fields</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      <div>
                        <label className="text-sm font-medium text-[#020B0A]">Total Fields</label>
                        <div className="text-lg font-semibold text-[#5C1B10]">
                          {result.propertyData.fieldAnalysis.totalFields}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#020B0A]">Valuable Fields Found</label>
                        <div className="text-lg font-semibold text-[#5C1B10]">
                          {result.propertyData.fieldAnalysis.valuableFields?.length || 0}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#020B0A]">Data Sections</label>
                        <div className="text-lg font-semibold text-[#5C1B10]">
                          {Object.keys(result.propertyData.fieldAnalysis.fieldsBySection).length}
                        </div>
                      </div>
                    </div>

                    {/* Valuable Fields */}
                    {result.propertyData.fieldAnalysis.valuableFields && result.propertyData.fieldAnalysis.valuableFields.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-medium text-[#020B0A] mb-3">High-Value Fields</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {result.propertyData.fieldAnalysis.valuableFields.map((field: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-[#F9F9F9] rounded border">
                              <span className="text-sm font-medium text-[#020B0A]">{field.field}</span>
                              <span className="text-sm text-[#5C1B10]">{JSON.stringify(field.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fields by Section */}
                    <div>
                      <h4 className="font-medium text-[#020B0A] mb-3">Fields by Section</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(result.propertyData.fieldAnalysis.fieldsBySection).map(([section, data]: [string, any]) => (
                          <div key={section} className="p-3 border border-[#D9DADA] rounded">
                            <div className="font-medium text-[#020B0A] capitalize">{section}</div>
                            <div className="text-sm text-[#020B0A] opacity-70">
                              {data.fieldCount} fields
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* All Fields */}
                <Card className="border-[#D9DADA]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-[#5C1B10]">All Available Fields</CardTitle>
                        <CardDescription>Complete BatchData response for this property</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowRawData(!showRawData)}
                        className="border-[#D9DADA]"
                      >
                        {showRawData ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showRawData ? 'Hide' : 'Show'} Raw Data
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showRawData ? (
                      <div className="space-y-4">
                        {/* Flattened Fields */}
                        {result.propertyData.allAvailableFields && (
                          <div>
                            <h4 className="font-medium text-[#020B0A] mb-3">Flattened Field Structure</h4>
                            <div className="max-h-96 overflow-y-auto bg-[#F9F9F9] p-4 rounded border">
                              {Object.entries(result.propertyData.allAvailableFields).map(([key, value], index) => (
                                <div key={index} className="flex items-start justify-between py-1 border-b border-gray-200 last:border-0">
                                  <code className="text-xs text-[#020B0A] mr-4 flex-shrink-0">{key}</code>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#5C1B10] break-all">
                                      {JSON.stringify(value)}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCopyField(key, value)}
                                      className="h-6 w-6 p-0 hover:bg-[#D9DADA]"
                                    >
                                      {copiedField === key ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Raw Property Object */}
                        <div>
                          <h4 className="font-medium text-[#020B0A] mb-3">Complete Raw Response</h4>
                          <pre className="max-h-96 overflow-auto bg-gray-900 text-green-400 p-4 rounded text-xs">
                            {JSON.stringify(result.propertyData.sampleProperty, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[#020B0A] opacity-70">
                        Click "Show Raw Data" to see all available fields
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* No Data Found */}
            {!result.propertyData.found && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-yellow-800">No Property Data Found</h3>
                    <p className="text-yellow-700 mt-2">
                      Try a different address format or check if the property exists in BatchData's database.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}