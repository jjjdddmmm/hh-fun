// Custom hook for property analysis management
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import { useNotifications } from '@/lib/contexts/NotificationContext';
import { useConfirmation } from '@/lib/contexts/ConfirmationContext';
import type { Property } from '@/lib/types/property';
import type { ComparablesData, AreaData } from '@/lib/types/comparables';

interface UsePropertyAnalysisReturn {
  // State
  properties: Property[];
  selectedProperty: Property | null;
  comparables: ComparablesData | null;
  areaData: AreaData | null;
  loadingComps: string | null;
  isLoading: boolean;
  creatingTimeline: string | null;
  
  // Actions
  setSelectedProperty: (property: Property | null) => void;
  addProperty: (mlsUrl: string) => Promise<boolean>;
  analyzeProperty: (propertyId: string) => Promise<boolean>;
  deleteProperty: (propertyId: string) => Promise<boolean>;
  refreshProperty: (propertyId: string) => Promise<boolean>;
  createTimeline: (property: Property) => Promise<void>;
  loadComparables: (property: Property) => Promise<void>;
  
  // Utility functions
  isPropertyBeingProcessed: (propertyId: string) => boolean;
}

export const usePropertyAnalysis = (): UsePropertyAnalysisReturn => {
  const { user } = useUser();
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useNotifications();
  const { confirm } = useConfirmation();

  // State
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [comparables, setComparables] = useState<ComparablesData | null>(null);
  const [areaData, setAreaData] = useState<AreaData | null>(null);
  const [loadingComps, setLoadingComps] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingTimeline, setCreatingTimeline] = useState<string | null>(null);

  // Load properties on mount
  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user]);

  /**
   * Loads all properties for the current user
   */
  const loadProperties = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/properties');
      
      if (!response.ok) {
        throw new Error('Failed to load properties');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProperties(data.properties || []);
      } else {
        throw new Error(data.error || 'Failed to load properties');
      }
    } catch (error) {
      logger.error('Error loading properties:', error);
      showError('Failed to load properties. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Adds a new property from MLS URL
   */
  const addProperty = async (mlsUrl: string): Promise<boolean> => {
    if (!mlsUrl.trim()) {
      showWarning('Please enter a valid MLS URL');
      return false;
    }

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mlsUrl: mlsUrl.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setProperties(prev => [...prev, data.property]);
        showSuccess('Property added successfully!');
        return true;
      } else {
        showError(data.error || 'Failed to add property');
        return false;
      }
    } catch (error) {
      logger.error('Error adding property:', error);
      showError('Failed to add property. Please try again.');
      return false;
    }
  };

  /**
   * Analyzes a property
   */
  const analyzeProperty = async (propertyId: string): Promise<boolean> => {
    try {
      // Optimistically update UI
      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, status: 'pending' as const } : p
      ));

      const response = await fetch(`/api/properties/${propertyId}/analyze`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setProperties(prev => prev.map(p => 
          p.id === propertyId ? { ...p, ...data.property } : p
        ));
        showSuccess('Property analysis completed!');
        return true;
      } else {
        // Revert optimistic update
        setProperties(prev => prev.map(p => 
          p.id === propertyId ? { ...p, status: 'error' as const } : p
        ));
        showError(data.error || 'Analysis failed');
        return false;
      }
    } catch (error) {
      logger.error('Error analyzing property:', error);
      // Revert optimistic update
      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, status: 'error' as const } : p
      ));
      showError('Failed to analyze property. Please try again.');
      return false;
    }
  };

  /**
   * Deletes a property with confirmation
   */
  const deleteProperty = async (propertyId: string): Promise<boolean> => {
    const confirmed = await confirm({
      title: "Delete Property",
      description: "Are you sure you want to delete this property? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "destructive"
    });

    if (!confirmed) return false;

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setProperties(prev => prev.filter(p => p.id !== propertyId));
        
        // Clear selected property if it was deleted
        if (selectedProperty?.id === propertyId) {
          setSelectedProperty(null);
        }
        
        showSuccess('Property deleted successfully');
        return true;
      } else {
        showError(data.error || 'Failed to delete property');
        return false;
      }
    } catch (error) {
      logger.error('Error deleting property:', error);
      showError('Failed to delete property. Please try again.');
      return false;
    }
  };

  /**
   * Refreshes property data
   */
  const refreshProperty = async (propertyId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/refresh`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setProperties(prev => prev.map(p => 
          p.id === propertyId ? { ...p, ...data.property } : p
        ));
        showSuccess('Property data refreshed');
        return true;
      } else {
        showError(data.error || 'Failed to refresh property');
        return false;
      }
    } catch (error) {
      logger.error('Error refreshing property:', error);
      showError('Failed to refresh property. Please try again.');
      return false;
    }
  };

  /**
   * Creates a timeline for a property
   */
  const createTimeline = async (property: Property): Promise<void> => {
    setCreatingTimeline(property.id);
    
    try {
      const response = await fetch('/api/timeline/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          propertyId: property.id,
          propertyData: property
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update property to mark it has a timeline
        setProperties(prev => prev.map(p => 
          p.id === property.id ? { ...p, hasTimeline: true } : p
        ));
        
        showSuccess('Timeline created successfully!');
        
        // Navigate to timeline
        window.open(`/timeline?propertyId=${property.id}`, '_blank');
      } else {
        showError(data.error || 'Failed to create timeline');
      }
    } catch (error) {
      logger.error('Error creating timeline:', error);
      showError('Failed to create timeline. Please try again.');
    } finally {
      setCreatingTimeline(null);
    }
  };

  /**
   * Loads comparable properties and area data
   */
  const loadComparables = async (property: Property): Promise<void> => {
    setLoadingComps(property.id);
    
    try {
      const [compsResponse, areaResponse] = await Promise.all([
        fetch(`/api/properties/${property.id}/comparables`),
        fetch(`/api/properties/${property.id}/area-data`)
      ]);

      const [compsData, areaDataResult] = await Promise.all([
        compsResponse.json(),
        areaResponse.json()
      ]);

      if (compsData.success) {
        setComparables(compsData.comparables);
      }

      if (areaDataResult.success) {
        setAreaData(areaDataResult.areaData);
      }
    } catch (error) {
      logger.error('Error loading comparables:', error);
      showError('Failed to load additional property data');
    } finally {
      setLoadingComps(null);
    }
  };

  /**
   * Checks if a property is currently being processed
   */
  const isPropertyBeingProcessed = useCallback((propertyId: string): boolean => {
    return loadingComps === propertyId || creatingTimeline === propertyId;
  }, [loadingComps, creatingTimeline]);

  return {
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
  };
};