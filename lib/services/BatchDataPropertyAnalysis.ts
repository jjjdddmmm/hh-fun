import { BatchDataService } from './BatchDataService';
import { BatchDataComparablesService } from './BatchDataComparablesService';

/**
 * BatchData Property Analysis Service
 * Provides comprehensive property analysis using only BatchData API
 * Replaces the expensive combination of Zillow + RentCast + Google Maps APIs
 */

export interface BatchDataPropertyData {
  zpid: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  yearBuilt: number;
  propertyType: string;
  daysOnMarket?: number;
  pricePerSqft?: number;
  soldDate?: string;
  description?: string;
  photos?: string[];
  // BatchData enhanced fields
  zestimate?: {
    amount: number;
    valuationRange: {
      low: number;
      high: number;
    };
  };
  rentZestimate?: number;
  propertyTaxes?: number;
  hoaFee?: number;
  lotSize?: number;
  features?: Record<string, boolean>;
  // Market insights
  quickLists?: {
    cashBuyer?: boolean;
    highEquity?: boolean;
    recentlySold?: boolean;
    fixAndFlip?: boolean;
    absenteeOwner?: boolean;
    [key: string]: boolean | undefined;
  };
  // Demographics and market data
  demographics?: {
    income?: number;
    netWorth?: number;
    [key: string]: any;
  };
}

export class BatchDataPropertyAnalysisService {
  private batchData: BatchDataService;
  private comparables: BatchDataComparablesService;
  
  constructor(useProduction: boolean = false) {
    this.batchData = new BatchDataService(useProduction);
    // Ensure comparables service uses the same API environment
    this.comparables = new BatchDataComparablesService(useProduction);
  }

  /**
   * Get comprehensive property analysis from BatchData
   * Replaces the expensive Zillow API calls
   */
  async getPropertyAnalysis(address: string, zpid?: string): Promise<BatchDataPropertyData | null> {
    try {
      if (!this.batchData.isAvailable()) {
        console.warn('BatchData API not available for property analysis');
        return null;
      }

      console.log(`🏠 BatchData: Analyzing property at ${address}`);

      // Multiple search strategies for better property discovery
      let properties: any[] = [];
      const searchStrategies = [
        // Strategy 1: Direct address search
        {
          name: 'Direct Address',
          query: {
            searchCriteria: { query: address },
            options: { take: 1, includeAll: true }
          }
        },
        // Strategy 2: If address has ZIP, try ZIP-based search
        ...(address.match(/\b\d{5}\b/) ? [{
          name: 'ZIP Code Search',
          query: {
            searchCriteria: { query: address.match(/\b\d{5}\b/)![0] },
            options: { take: 5, includeAll: true }
          }
        }] : []),
        // Strategy 3: Clean address (remove extra words)
        {
          name: 'Cleaned Address',
          query: {
            searchCriteria: { 
              query: address.replace(/\b(property|address|needed)\b/gi, '').trim() 
            },
            options: { take: 3, includeAll: true }
          }
        }
      ];

      for (const strategy of searchStrategies) {
        try {
          console.log(`🔎 Trying ${strategy.name} search: "${strategy.query.searchCriteria.query}"`);
          
          const searchResult = await this.batchData.makeRequest('/api/v1/property/search', strategy.query, 'POST');
          
          if (searchResult.success && searchResult.data) {
            const foundProperties = this.extractPropertiesFromResponse(searchResult.data);
            if (foundProperties.length > 0) {
              console.log(`✅ ${strategy.name} found ${foundProperties.length} properties`);
              properties = foundProperties;
              break;
            }
          }
        } catch (error) {
          console.log(`❌ ${strategy.name} failed:`, error);
          continue;
        }
      }

      if (properties.length === 0) {
        console.error('❌ No properties found with any search strategy');
        return null;
      }

      // Select best property match (prefer exact address matches)
      let property = properties[0];
      if (properties.length > 1 && address !== 'Address extraction failed - using property lookup') {
        // Try to find exact match by comparing addresses
        const exactMatch = properties.find(p => {
          const propAddr = this.extractAddress(p).toLowerCase();
          const searchAddr = address.toLowerCase();
          return propAddr.includes(searchAddr.split(' ')[0]) || // House number match
                 searchAddr.includes(propAddr.split(' ')[0]);
        });
        if (exactMatch) {
          property = exactMatch;
          console.log('🎯 Found exact address match');
        }
      }
      
      const extractedAddress = this.extractAddress(property);
      console.log(`✅ Selected property: ${extractedAddress}`);
      console.log(`📊 Property data preview:`, {
        price: this.extractPrice(property),
        bedrooms: this.extractBedrooms(property),
        bathrooms: this.extractBathrooms(property),
        sqft: property.building?.totalBuildingAreaSquareFeet
      });

      // Convert BatchData format to expected format
      const propertyData = this.convertBatchDataToPropertyData(property, zpid);
      
      // Use BatchData's own valuation data instead of running comparables
      if (property.valuation) {
        propertyData.zestimate = {
          amount: property.valuation.estimatedValue || propertyData.price,
          valuationRange: {
            low: (property.valuation.estimatedValue || propertyData.price) * 0.95,
            high: (property.valuation.estimatedValue || propertyData.price) * 1.05
          }
        };
      }
      
      // Use BatchData's rental estimate if available
      if (property.rental?.estimatedRent) {
        propertyData.rentZestimate = property.rental.estimatedRent;
      }

      console.log(`📊 BatchData analysis complete: $${propertyData.price?.toLocaleString()} | ${propertyData.bedrooms}bd/${propertyData.bathrooms}ba | ${propertyData.livingArea}sqft`);
      
      return propertyData;

    } catch (error) {
      console.error('Error in BatchData property analysis:', error);
      return null;
    }
  }

  /**
   * Get comparable sales analysis using BatchData
   * Replaces expensive RentCast API calls
   */
  private async getComparableAnalysis(address: string, propertyData: BatchDataPropertyData) {
    try {
      // Extract zip code for comparable search
      const zipCode = this.extractZipCode(address, propertyData);
      
      const comparables = await this.comparables.getComparables(
        address,
        zipCode,
        propertyData.bedrooms,
        propertyData.bathrooms,
        propertyData.livingArea,
        0.5, // 0.5 mile radius
        'Single Family'
      );

      if (!comparables || comparables.comparables.length === 0) {
        console.warn('No comparables found for property analysis');
        return null;
      }

      // Calculate enhanced market insights
      const avgPrice = comparables.stats.averagePrice;
      const avgPricePerSqft = comparables.stats.averagePricePerSqft;
      
      // Estimate current market value based on comparables
      const estimatedValue = propertyData.livingArea * avgPricePerSqft;
      
      // Estimate monthly rent using 1% rule adjusted by local market
      const rentMultiplier = this.calculateRentMultiplier(comparables.comparables);
      const estimatedRent = Math.round(estimatedValue * rentMultiplier);

      return {
        estimatedValue: Math.round(estimatedValue),
        estimatedRent,
        comparableCount: comparables.comparables.length,
        priceRange: comparables.stats.priceRange,
        marketInsights: {
          avgPrice,
          avgPricePerSqft,
          marketTrend: this.analyzeMarketTrend(comparables.comparables),
          demandLevel: this.analyzeDemandLevel(comparables.comparables)
        }
      };

    } catch (error) {
      console.error('Error getting comparable analysis:', error);
      return null;
    }
  }

  /**
   * Convert BatchData property to expected format
   */
  private convertBatchDataToPropertyData(property: any, zpid?: string): BatchDataPropertyData {
    console.log('🔧 Converting BatchData property to expected format...');
    console.log('📊 Raw property data keys:', Object.keys(property));
    
    // Log MLS data specifically to check for photos
    if (property.mls) {
      console.log('📷 MLS data available, keys:', Object.keys(property.mls));
      if (property.mls.photos || property.mls.images || property.mls.media) {
        console.log('🖼️ Found MLS photos/images/media!');
      }
    }
    
    const address = this.extractAddress(property);
    const price = this.extractPrice(property);
    const bedrooms = this.extractBedrooms(property);
    const bathrooms = this.extractBathrooms(property);
    const livingArea = property.building?.totalBuildingAreaSquareFeet || 
                      property.mls?.totalBuildingAreaSquareFeet || 
                      property.squareFootage || 2000;
    
    console.log('🏠 Extracted core data:', {
      address,
      price,
      bedrooms,
      bathrooms,
      livingArea
    });
    
    const propertyData: BatchDataPropertyData = {
      zpid: zpid || property._id || property.id || 'batchdata-' + Date.now(),
      address: address,
      city: property.address?.city || property.city || '',
      state: property.address?.state || property.state || '',
      zipcode: property.address?.zip || property.zipCode || this.extractZipCode(address),
      price: price,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      livingArea: livingArea,
      yearBuilt: property.building?.yearBuilt || property.mls?.yearBuilt || property.yearBuilt || 2000,
      propertyType: property.building?.propertyType || property.mls?.propertyType || property.propertyType || 'Single Family',
      daysOnMarket: property.mls?.daysOnMarket || property.daysOnMarket || 0,
      pricePerSqft: this.calculatePricePerSqft(price, livingArea),
      soldDate: property.intel?.lastSoldDate || property.mls?.soldDate || property.sale?.lastSale?.saleDate,
      description: this.generateDescription(property),
      photos: this.extractPhotos(property),
      // Enhanced BatchData fields with proper data extraction
      propertyTaxes: property.tax?.assessedValue || property.assessment?.assessedValue || 0,
      hoaFee: property.mls?.hoaFee || property.hoaFee || 0,
      lotSize: property.building?.lotSizeSquareFeet || property.lot?.lotSizeSquareFeet || property.lotSize || 0,
      features: this.extractFeatures(property),
      // Market insights - ensure these are properly extracted
      quickLists: property.quickLists || this.generateQuickLists(property),
      demographics: property.demographics || property.neighborhood || {},
      // Add valuation data for zestimate
      zestimate: property.valuation?.estimatedValue ? {
        amount: property.valuation.estimatedValue,
        valuationRange: {
          low: property.valuation.estimatedValue * 0.95,
          high: property.valuation.estimatedValue * 1.05
        }
      } : undefined,
      rentZestimate: property.rental?.estimatedRent || property.rentEstimate || 0
    };
    
    console.log('✅ Final property data:', {
      zpid: propertyData.zpid,
      address: propertyData.address,
      price: propertyData.price,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      hasQuickLists: Object.keys(propertyData.quickLists || {}).length > 0,
      hasZestimate: !!propertyData.zestimate
    });
    
    return propertyData;
  }
  
  /**
   * Generate quick lists from property data if not provided
   */
  private generateQuickLists(property: any): any {
    const quickLists: any = {};
    
    // Generate insights based on available data
    if (property.sale?.lastSale?.saleDate) {
      const saleDate = new Date(property.sale.lastSale.saleDate);
      const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      quickLists.recentlySold = monthsAgo <= 12;
    }
    
    if (property.mls?.price && property.valuation?.estimatedValue) {
      const priceRatio = property.mls.price / property.valuation.estimatedValue;
      quickLists.listedBelowMarketPrice = priceRatio < 0.95;
    }
    
    if (property.openLien?.totalOpenLienBalance && property.valuation?.estimatedValue) {
      const ltvRatio = property.openLien.totalOpenLienBalance / property.valuation.estimatedValue;
      quickLists.highEquity = ltvRatio < 0.5;
      quickLists.lowEquity = ltvRatio > 0.8;
    }
    
    // Default some common flags
    quickLists.cashBuyer = false;
    quickLists.fixAndFlip = false;
    quickLists.absenteeOwner = false;
    quickLists.ownerOccupied = true;
    
    console.log('📈 Generated quick lists:', quickLists);
    return quickLists;
  }

  /**
   * Extract properties from BatchData response
   */
  private extractPropertiesFromResponse(response: any): any[] {
    return (
      response?.results?.properties ||
      response?.properties ||
      response?.data?.results?.properties ||
      response?.data?.properties ||
      []
    );
  }

  /**
   * Extract address from BatchData format
   */
  private extractAddress(property: any): string {
    return (
      property.address?.street ||
      property.address?.fullAddress ||
      `${property.address?.houseNumber || ''} ${property.address?.streetName || ''}`.trim() ||
      'Address unavailable'
    );
  }

  /**
   * Extract price from BatchData with priority order and debugging
   */
  private extractPrice(property: any): number {
    // Priority: intel > MLS sold > MLS listing > valuation > sale history
    const intelPrice = property.intel?.lastSoldPrice;
    const mlsSoldPrice = property.mls?.soldPrice;
    const mlsPrice = property.mls?.price;
    const valuationPrice = property.valuation?.estimatedValue;
    const salePrice = property.sale?.lastSale?.price;
    const assessedValue = property.assessment?.assessedValue;
    
    console.log('💰 Price extraction debug:', {
      intel: intelPrice,
      mlsSold: mlsSoldPrice,
      mlsListing: mlsPrice,
      valuation: valuationPrice,
      sale: salePrice,
      assessed: assessedValue
    });
    
    const price = intelPrice || mlsSoldPrice || mlsPrice || valuationPrice || salePrice || assessedValue || 500000;
    console.log(`✅ Selected price: $${price.toLocaleString()}`);
    
    return price;
  }

  /**
   * Extract bedroom count
   */
  private extractBedrooms(property: any): number {
    return property.mls?.bedroomCount || 
           property.building?.bedroomCount || 
           property.bedrooms || 3;
  }

  /**
   * Extract bathroom count  
   */
  private extractBathrooms(property: any): number {
    return property.building?.bathroomCount ||
           property.mls?.bathroomCount || 
           property.bathrooms || 2;
  }

  /**
   * Calculate price per square foot
   */
  private calculatePricePerSqft(price: number, sqft?: number): number {
    if (!price || !sqft || sqft <= 0) return 0;
    return Math.round(price / sqft);
  }

  /**
   * Extract zip code from address or property data
   */
  private extractZipCode(address: string, propertyData?: BatchDataPropertyData): string {
    if (propertyData?.zipcode) return propertyData.zipcode;
    const zipMatch = address.match(/\b\d{5}\b/);
    return zipMatch ? zipMatch[0] : '90210';
  }

  /**
   * Generate property description from BatchData fields
   */
  private generateDescription(property: any): string {
    const features = [];
    
    if (property.building?.pool) features.push('Pool');
    if (property.building?.fireplaceCount) features.push(`${property.building.fireplaceCount} Fireplace(s)`);
    if (property.building?.garageParkingSpaceCount) features.push(`${property.building.garageParkingSpaceCount} Car Garage`);
    
    const quickListFeatures = [];
    if (property.quickLists?.highEquity) quickListFeatures.push('High Equity');
    if (property.quickLists?.cashBuyer) quickListFeatures.push('Cash Buyer History');
    if (property.quickLists?.recentlySold) quickListFeatures.push('Recently Sold');
    
    let description = `Property features: ${features.length ? features.join(', ') : 'Standard features'}`;
    if (quickListFeatures.length > 0) {
      description += `. Investment insights: ${quickListFeatures.join(', ')}`;
    }
    
    return description;
  }

  /**
   * Extract photos with better defaults based on property type and features
   */
  private extractPhotos(property: any): string[] {
    // First, check if BatchData provides actual photos in various possible locations
    const mlsPhotos = property.mls?.photos || property.mls?.images || property.mls?.media;
    const propertyPhotos = property.photos || property.images || property.media;
    const listingPhotos = property.listing?.photos || property.listing?.images;
    
    // Log to help debug what fields are available
    console.log('🖼️ Photo extraction debug:', {
      hasMlsPhotos: !!mlsPhotos,
      hasPropertyPhotos: !!propertyPhotos,
      hasListingPhotos: !!listingPhotos,
      mlsPhotoCount: Array.isArray(mlsPhotos) ? mlsPhotos.length : 0,
      propertyPhotoCount: Array.isArray(propertyPhotos) ? propertyPhotos.length : 0
    });
    
    // Try to get real photos from various possible sources
    const realPhotos = mlsPhotos || propertyPhotos || listingPhotos;
    
    // If we have real photos, return them (ensure they're in array format)
    if (realPhotos && Array.isArray(realPhotos) && realPhotos.length > 0) {
      console.log(`✅ Found ${realPhotos.length} actual property photos from BatchData`);
      return realPhotos.slice(0, 10); // Limit to 10 photos max
    }
    
    // If no real photos available, use contextual placeholder images
    console.log('⚠️ No actual photos found in BatchData, using placeholder images');
    
    const hasPool = property.building?.pool || property.quickLists?.pool;
    const propertyType = property.building?.propertyType || property.mls?.propertyType || 'Single Family';
    const isHighEnd = (property.valuation?.estimatedValue || 0) > 800000;
    
    // Select appropriate hero image based on property characteristics
    let heroImage = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges'; // Default single family
    
    if (hasPool && isHighEnd) {
      heroImage = 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=600&fit=crop&crop=edges'; // Luxury home with pool
    } else if (hasPool) {
      heroImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop&crop=edges'; // Home with pool
    } else if (isHighEnd) {
      heroImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop&crop=edges'; // Luxury home
    } else if (propertyType.toLowerCase().includes('condo')) {
      heroImage = 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop&crop=edges'; // Modern condo
    }
    
    return [
      heroImage,
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&crop=edges',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop&crop=edges'
    ];
  }

  /**
   * Extract property features from BatchData
   */
  private extractFeatures(property: any): Record<string, boolean> {
    return {
      pool: property.building?.pool || false,
      fireplace: (property.building?.fireplaceCount || 0) > 0,
      garage: (property.building?.garageParkingSpaceCount || 0) > 0,
      updated_kitchen: false, // BatchData doesn't typically have this
      hardwood_floors: false, // BatchData doesn't typically have this
      new_construction: (new Date().getFullYear() - (property.building?.yearBuilt || 2000)) < 5
    };
  }

  /**
   * Calculate rent multiplier based on local comparable data
   */
  private calculateRentMultiplier(comparables: any[]): number {
    // Base 1% rule, adjust based on market data
    let baseMultiplier = 0.01;
    
    // Analyze comparable rent-to-price ratios if available
    const rentRatios = comparables
      .filter(comp => comp.batchDataInsights?.estimatedRent && comp.price)
      .map(comp => (comp.batchDataInsights.estimatedRent * 12) / comp.price);
    
    if (rentRatios.length > 0) {
      const avgRentRatio = rentRatios.reduce((a, b) => a + b, 0) / rentRatios.length;
      baseMultiplier = avgRentRatio / 12; // Convert annual to monthly
    }
    
    // Ensure reasonable bounds (0.5% to 2% monthly)
    return Math.max(0.005, Math.min(0.02, baseMultiplier));
  }

  /**
   * Analyze market trend from comparable sales
   */
  private analyzeMarketTrend(comparables: any[]): 'hot' | 'warm' | 'cold' | 'declining' {
    const recentSales = comparables.filter(comp => 
      comp.soldDate && new Date(comp.soldDate) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    );
    
    const avgDaysOnMarket = comparables
      .filter(comp => comp.daysOnMarket > 0)
      .reduce((sum, comp) => sum + comp.daysOnMarket, 0) / Math.max(1, comparables.length);
    
    if (recentSales.length > comparables.length * 0.7 && avgDaysOnMarket < 30) return 'hot';
    if (recentSales.length > comparables.length * 0.4 && avgDaysOnMarket < 60) return 'warm';
    if (avgDaysOnMarket > 90) return 'cold';
    return 'declining';
  }

  /**
   * Analyze demand level from market data
   */
  private analyzeDemandLevel(comparables: any[]): 'high' | 'medium' | 'low' {
    const avgDaysOnMarket = comparables
      .filter(comp => comp.daysOnMarket > 0)
      .reduce((sum, comp) => sum + comp.daysOnMarket, 0) / Math.max(1, comparables.length);
    
    if (avgDaysOnMarket < 30) return 'high';
    if (avgDaysOnMarket < 60) return 'medium';
    return 'low';
  }

  /**
   * Validate property data completeness
   */
  validatePropertyData(data: BatchDataPropertyData): boolean {
    return !!(
      data.address &&
      data.price > 0 &&
      data.bedrooms > 0 &&
      data.bathrooms > 0 &&
      data.livingArea > 0
    );
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.batchData.isAvailable();
  }
}

/**
 * Factory function for easy integration
 */
export function createBatchDataPropertyAnalysisService(useProduction: boolean = false): BatchDataPropertyAnalysisService | null {
  try {
    const service = new BatchDataPropertyAnalysisService(useProduction);
    return service.isAvailable() ? service : null;
  } catch (error) {
    console.error('Failed to create BatchData property analysis service:', error);
    return null;
  }
}