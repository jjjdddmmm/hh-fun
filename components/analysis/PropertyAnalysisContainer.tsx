// Main container component for property analysis page
// Replaces the monolithic 1,668-line analysis page component
import React, { useState } from 'react';
import { PropertyAddForm } from './PropertyAddForm';
import { PropertyGrid } from './PropertyGrid';
import { PropertyAnalysisModal } from './PropertyAnalysisModal';
import { PropertyAnalysisHeader } from './PropertyAnalysisHeader';
import { usePropertyAnalysis } from '@/lib/hooks/usePropertyAnalysis';
import { StreamlinedOfferStrategy } from '@/components/analysis/StreamlinedOfferStrategy';
import type { Property } from '@/lib/types/property';
import type { ComparablesData, AreaData } from '@/lib/types/comparables';

export const PropertyAnalysisContainer: React.FC = () => {
  const {
    // State
    properties,
    selectedProperty,
    comparables,
    areaData,
    loadingComps,
    isLoading,
    creatingTimeline,
    
    // Actions
    setSelectedProperty,
    addProperty,
    analyzeProperty,
    deleteProperty,
    refreshProperty,
    createTimeline,
    loadComparables,
    
    // Utilities
    isPropertyBeingProcessed
  } = usePropertyAnalysis();

  // Local modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showOfferStrategy, setShowOfferStrategy] = useState(false);

  const handleOpenModal = (property: Property) => {
    setSelectedProperty(property);
    setShowAnalysisModal(true);
  };

  const handleCloseModal = () => {
    setShowAnalysisModal(false);
    setSelectedProperty(null);
  };

  const handleOpenDealMaker = async (property: Property) => {
    setSelectedProperty(property);
    setShowOfferStrategy(true);
    
    // Load comparables and area data for the deal maker
    if (!comparables || !areaData) {
      await loadComparables(property);
    }
  };

  const handleCloseDealMaker = () => {
    setShowOfferStrategy(false);
    setSelectedProperty(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C1B10] mx-auto mb-4" />
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <PropertyAnalysisHeader propertiesCount={properties.length} />

        {/* Add Property Form */}
        <div className="mb-8">
          <PropertyAddForm 
            onAddProperty={addProperty}
            isLoading={isLoading}
          />
        </div>

        {/* Properties Grid */}
        <PropertyGrid
          properties={properties}
          onAnalyze={analyzeProperty}
          onDelete={deleteProperty}
          onRefresh={refreshProperty}
          onOpenModal={handleOpenModal}
          onOpenDealMaker={handleOpenDealMaker}
          onCreateTimeline={createTimeline}
          isPropertyBeingProcessed={isPropertyBeingProcessed}
          creatingTimeline={creatingTimeline}
        />

        {/* Analysis Modal */}
        {showAnalysisModal && selectedProperty && (
          <PropertyAnalysisModal
            property={selectedProperty}
            comparables={comparables}
            areaData={areaData}
            onClose={handleCloseModal}
            onLoadComparables={() => loadComparables(selectedProperty)}
            isLoadingComps={loadingComps === selectedProperty.id}
          />
        )}

        {/* Offer Strategy Modal */}
        {showOfferStrategy && selectedProperty && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Deal Maker Strategy
                  </h2>
                  <button
                    onClick={handleCloseDealMaker}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close deal maker"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <StreamlinedOfferStrategy 
                  property={selectedProperty}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};