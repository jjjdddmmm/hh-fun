// Property grid component - displays list of analyzed properties
import React from 'react';
import { PropertyCard } from '@/components/property-analysis/PropertyCard';
import type { Property } from '@/lib/types/property';

interface PropertyGridProps {
  properties: Property[];
  onAnalyze: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRefresh: (id: string) => Promise<boolean>;
  onOpenModal: (property: Property) => void;
  onOpenDealMaker: (property: Property) => void;
  onCreateTimeline: (property: Property) => void;
  isPropertyBeingProcessed: (id: string) => boolean;
  creatingTimeline: string | null;
}

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  properties,
  onAnalyze,
  onDelete,
  onRefresh,
  onOpenModal,
  onOpenDealMaker,
  onCreateTimeline,
  isPropertyBeingProcessed,
  creatingTimeline
}) => {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 3h10M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4M9 21h6" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Added</h3>
        <p className="text-gray-600 mb-6">
          Add your first property using the MLS URL above to get started with analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          onAnalyze={onAnalyze}
          onDelete={onDelete}
          onRefresh={onRefresh}
          onOpenModal={onOpenModal}
          onOpenDealMaker={onOpenDealMaker}
          onCreateTimeline={onCreateTimeline}
          isRefreshing={isPropertyBeingProcessed(property.id)}
          isCreatingTimeline={creatingTimeline === property.id}
        />
      ))}
    </div>
  );
};