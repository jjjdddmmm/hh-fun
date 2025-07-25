// Custom hook for property data management
// Extracted from the massive 2,963-line analysis component

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { logger } from '@/lib/utils/logger';
import type { Property } from '@/components/property-analysis/types';

interface UsePropertiesReturn {
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  loadProperties: () => Promise<void>;
  addProperty: (mlsUrl: string) => Promise<boolean>;
  deleteProperty: (id: string) => Promise<boolean>;
  refreshProperty: (id: string) => Promise<boolean>;
  analyzeProperty: (id: string) => Promise<boolean>;
}

export const useProperties = (): UsePropertiesReturn => {
  const { user } = useUser();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if timeline exists for a property
  const checkTimelineExists = async (propertyId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/timeline/list');
      if (response.ok) {
        const data = await response.json();
        return data.timelines?.some((timeline: any) => 
          timeline.propertyId === propertyId
        ) || false;
      }
      return false;
    } catch (error) {
      logger.error('Error checking timeline existence:', error);
      return false;
    }
  };

  // Load user's properties
  const loadProperties = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
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
        } else {
          setError(data.error || 'Failed to load properties');
        }
      } else {
        setError('Failed to fetch properties');
      }
    } catch (error) {
      logger.error('Error loading properties:', error);
      setError('Error loading properties');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add new property
  const addProperty = useCallback(async (mlsUrl: string): Promise<boolean> => {
    if (!mlsUrl.trim() || !user) return false;

    try {
      setError(null);
      
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mlsUrl: mlsUrl.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.property) {
          // Add new property to the list
          setProperties(prev => [...prev, { ...data.property, hasTimeline: false }]);
          return true;
        } else {
          setError(data.error || 'Failed to add property');
          return false;
        }
      } else {
        setError('Failed to add property');
        return false;
      }
    } catch (error) {
      logger.error('Error adding property:', error);
      setError('Error adding property');
      return false;
    }
  }, [user]);

  // Delete property
  const deleteProperty = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/properties/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove property from the list
        setProperties(prev => prev.filter(p => p.id !== id));
        return true;
      } else {
        setError('Failed to delete property');
        return false;
      }
    } catch (error) {
      logger.error('Error deleting property:', error);
      setError('Error deleting property');
      return false;
    }
  }, []);

  // Refresh property data
  const refreshProperty = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Update property status to pending
      setProperties(prev => 
        prev.map(p => p.id === id ? { ...p, status: 'pending' as const } : p)
      );

      const response = await fetch(`/api/properties/${id}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.property) {
          // Update the property in the list
          setProperties(prev => 
            prev.map(p => p.id === id ? { ...p, ...data.property } : p)
          );
          return true;
        } else {
          // Revert status on error
          setProperties(prev => 
            prev.map(p => p.id === id ? { ...p, status: 'error' as const } : p)
          );
          setError(data.error || 'Failed to refresh property');
          return false;
        }
      } else {
        // Revert status on error
        setProperties(prev => 
          prev.map(p => p.id === id ? { ...p, status: 'error' as const } : p)
        );
        setError('Failed to refresh property');
        return false;
      }
    } catch (error) {
      logger.error('Error refreshing property:', error);
      setProperties(prev => 
        prev.map(p => p.id === id ? { ...p, status: 'error' as const } : p)
      );
      setError('Error refreshing property');
      return false;
    }
  }, []);

  // Analyze property
  const analyzeProperty = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Update property status to pending
      setProperties(prev => 
        prev.map(p => p.id === id ? { ...p, status: 'pending' as const } : p)
      );

      const response = await fetch('/api/property-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyId: id }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the property with analysis results
          setProperties(prev => 
            prev.map(p => p.id === id ? { 
              ...p, 
              status: 'analyzed' as const,
              analysis: data.analysis 
            } : p)
          );
          return true;
        } else {
          setProperties(prev => 
            prev.map(p => p.id === id ? { ...p, status: 'error' as const } : p)
          );
          setError(data.error || 'Failed to analyze property');
          return false;
        }
      } else {
        setProperties(prev => 
          prev.map(p => p.id === id ? { ...p, status: 'error' as const } : p)
        );
        setError('Failed to analyze property');
        return false;
      }
    } catch (error) {
      logger.error('Error analyzing property:', error);
      setProperties(prev => 
        prev.map(p => p.id === id ? { ...p, status: 'error' as const } : p)
      );
      setError('Error analyzing property');
      return false;
    }
  }, []);

  // Load properties when user is available
  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user, loadProperties]);

  return {
    properties,
    isLoading,
    error,
    loadProperties,
    addProperty,
    deleteProperty,
    refreshProperty,
    analyzeProperty,
  };
};