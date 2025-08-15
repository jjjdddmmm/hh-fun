// Header component for property analysis page
import React from 'react';
import { SectionHeader } from '@/components/ui/section-header';
import { Home, TrendingUp } from 'lucide-react';

interface PropertyAnalysisHeaderProps {
  propertiesCount: number;
}

export const PropertyAnalysisHeader: React.FC<PropertyAnalysisHeaderProps> = ({
  propertiesCount
}) => {
  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <Home className="h-4 w-4" />
        <span>Property Analysis</span>
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Property Investment Analysis
          </h1>
          <p className="text-xl text-gray-600">
            AI-powered analysis to evaluate investment potential, market value, and negotiation opportunities.
          </p>
        </div>
        
        {/* Stats Badge */}
        {propertiesCount > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-[#5C1B10]/5 border border-[#5C1B10]/20 rounded-lg px-4 py-2">
            <TrendingUp className="h-5 w-5 text-[#5C1B10]" />
            <div className="text-right">
              <p className="text-sm font-medium text-[#5C1B10]">
                {propertiesCount} Properties
              </p>
              <p className="text-xs text-gray-600">
                Analyzed
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};