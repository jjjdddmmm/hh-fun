// Individual property card component
// Extracted from the massive 2,963-line analysis component

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Target, 
  Calendar,
  TrendingUp,
  DollarSign 
} from "lucide-react";
import { PropertyStatusBadge } from "./ui/PropertyStatusBadge";
import { PriceDisplay } from "./ui/PriceDisplay";
import { PropertySpecs } from "./ui/PropertySpecs";
import { getRecommendationColor } from "./utils";
import type { Property } from "./types";

interface PropertyCardProps {
  property: Property;
  onAnalyze: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRefresh: (id: string) => Promise<boolean>;
  onOpenModal: (property: Property) => void;
  onOpenDealMaker: (property: Property) => void;
  onCreateTimeline: (property: Property) => void;
  isDeleting?: boolean;
  isRefreshing?: boolean;
  isCreatingTimeline?: boolean;
}

export const PropertyCard = ({
  property,
  onAnalyze,
  onDelete,
  onRefresh,
  onOpenModal,
  onOpenDealMaker,
  onCreateTimeline,
  isDeleting = false,
  isRefreshing = false,
  isCreatingTimeline = false
}: PropertyCardProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await onAnalyze(property.id);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      await onDelete(property.id);
    }
  };

  const isActionDisabled = isDeleting || isRefreshing || isCreatingTimeline || isAnalyzing;

  return (
    <Card className="h-full flex flex-col relative">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-medium line-clamp-2 mb-1">
              {property.address}
            </CardTitle>
            <CardDescription className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-3 h-3 mr-1" />
              {property.city}, {property.state} {property.zipCode}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <PropertyStatusBadge status={property.status} />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => window.open(property.mlsUrl, '_blank')}
              title="View on MLS"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-0">
        {property.data && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <PriceDisplay 
                price={property.data.price} 
                size="lg"
                className="text-blue-600 font-semibold"
              />
              {property.data.daysOnMarket > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {property.data.daysOnMarket} days on market
                </Badge>
              )}
            </div>
            
            <PropertySpecs data={property.data} />
            
            {property.data.yearBuilt && (
              <div className="text-sm text-gray-600">
                Built: {property.data.yearBuilt}
              </div>
            )}
          </div>
        )}

        {property.analysis && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <Badge 
                className={`${getRecommendationColor(property.analysis.recommendation)} text-xs`}
              >
                {property.analysis.recommendation.charAt(0).toUpperCase() + 
                 property.analysis.recommendation.slice(1)}
              </Badge>
              <div className="text-sm font-medium text-gray-700">
                Score: {property.analysis.investmentScore}/100
              </div>
            </div>
            
            {property.analysis.keyInsights && property.analysis.keyInsights.length > 0 && (
              <div className="text-xs text-gray-600">
                {property.analysis.keyInsights[0]}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col space-y-2 mt-auto">
          {property.status === 'analyzed' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => onOpenModal(property)}
                className="w-full"
                disabled={isActionDisabled}
              >
                <Target className="w-4 h-4 mr-2" />
                View Analysis
              </Button>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenDealMaker(property)}
                  className="flex-1"
                  disabled={isActionDisabled}
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Deal Maker
                </Button>
                
                {!property.hasTimeline ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateTimeline(property)}
                    className="flex-1"
                    disabled={isActionDisabled || isCreatingTimeline}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    {isCreatingTimeline ? 'Creating...' : 'Timeline'}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open('/timeline', '_blank')}
                    className="flex-1"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    View Timeline
                  </Button>
                )}
              </div>
            </>
          )}

          {property.status !== 'analyzed' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAnalyze}
              disabled={isActionDisabled || property.status === 'pending'}
              className="w-full"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {property.status === 'pending' ? 'Analyzing...' : 'Analyze Property'}
            </Button>
          )}

          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRefresh(property.id)}
              disabled={isActionDisabled}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isActionDisabled}
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};