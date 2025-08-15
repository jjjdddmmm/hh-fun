// Property analysis modal component - displays detailed analysis results
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  DollarSign,
  MapPin,
  Calendar,
  Square,
  Bed,
  Bath
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';
import { 
  getRecommendationColor, 
  calculateScoreBreakdown,
  calculateTotalScore 
} from '@/lib/utils/property-analysis';
import type { Property } from '@/lib/types/property';
import type { ComparablesData, AreaData } from '@/lib/types/comparables';

interface PropertyAnalysisModalProps {
  property: Property;
  comparables: ComparablesData | null;
  areaData: AreaData | null;
  onClose: () => void;
  onLoadComparables: () => void;
  isLoadingComps: boolean;
}

export const PropertyAnalysisModal: React.FC<PropertyAnalysisModalProps> = ({
  property,
  comparables,
  areaData,
  onClose,
  onLoadComparables,
  isLoadingComps
}) => {
  const { data, analysis } = property;

  // Load comparables when modal opens if not already loaded
  useEffect(() => {
    if (!comparables && !areaData && !isLoadingComps) {
      onLoadComparables();
    }
  }, [comparables, areaData, isLoadingComps, onLoadComparables]);

  if (!data || !analysis) {
    return null;
  }

  const scoreBreakdown = calculateScoreBreakdown(property);
  const totalScore = calculateTotalScore(scoreBreakdown);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {data.address}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {property.city}, {property.state}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatPrice(data.price)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={getRecommendationColor(analysis.recommendation)}>
                {analysis.recommendation.charAt(0).toUpperCase() + analysis.recommendation.slice(1)}
              </Badge>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close analysis modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Property Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="h-5 w-5" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {data.sqft.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Square Feet</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <Bed className="h-5 w-5" />
                    {data.bedrooms}
                  </div>
                  <div className="text-sm text-gray-600">Bedrooms</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <Bath className="h-5 w-5" />
                    {data.bathrooms}
                  </div>
                  <div className="text-sm text-gray-600">Bathrooms</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <Calendar className="h-5 w-5" />
                    {data.yearBuilt}
                  </div>
                  <div className="text-sm text-gray-600">Year Built</div>
                </div>
              </div>
              
              {data.daysOnMarket > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {data.daysOnMarket} days on market
                    </div>
                    <div className="text-sm text-gray-600">
                      Price per sq ft: {formatPrice(data.pricePerSqft)}/sq ft
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Investment Analysis Score: {totalScore}/100
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(scoreBreakdown).map(([key, component]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-medium">
                        {component.score}/{component.maxScore}
                      </span>
                    </div>
                    <Progress 
                      value={(component.score / component.maxScore) * 100} 
                      className="h-2"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      {component.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Market Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Market Value Range</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Low:</span>
                      <span className="font-medium">{formatPrice(analysis.marketValue.low)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated:</span>
                      <span className="font-medium">{formatPrice(analysis.marketValue.estimated)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>High:</span>
                      <span className="font-medium">{formatPrice(analysis.marketValue.high)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span>AI Confidence:</span>
                      <span className="font-medium">{analysis.aiConfidence}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Market Trends</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Price Comparison:</span>
                      <span>{analysis.marketAnalysis.pricePerSqftComparison}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Trend:</span>
                      <span>{analysis.marketAnalysis.marketTrend}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Demand Level:</span>
                      <span>{analysis.marketAnalysis.demandLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Appreciation:</span>
                      <span>{analysis.marketAnalysis.appreciation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          {analysis.keyInsights && analysis.keyInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.keyInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Red Flags */}
          {analysis.redFlags && analysis.redFlags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Red Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.redFlags.map((flag, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{flag}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {analysis.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {analysis.analysis}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-lg">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};