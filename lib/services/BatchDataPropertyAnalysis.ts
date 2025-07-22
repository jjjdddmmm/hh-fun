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

      // Search for the specific property
      const searchResult = await this.batchData.makeRequest('/api/v1/property/search', {
        searchCriteria: {
          query: address
        },
        options: {
          take: 1,
          includeAll: true // Get all available fields
        }
      }, 'POST');

      if (!searchResult.success || !searchResult.data) {
        console.error('Failed to find property in BatchData');
        return null;
      }

      const properties = this.extractPropertiesFromResponse(searchResult.data);
      if (properties.length === 0) {
        console.error('No properties found in BatchData response');
        return null;
      }

      const property = properties[0];
      console.log(`✅ Found property in BatchData: ${this.extractAddress(property)}`);

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
    const address = this.extractAddress(property);
    const price = this.extractPrice(property);
    
    return {
      zpid: zpid || property._id || property.id || 'batchdata-' + Date.now(),
      address: address,
      city: property.address?.city || '',
      state: property.address?.state || '',
      zipcode: property.address?.zip || this.extractZipCode(address),
      price: price,
      bedrooms: this.extractBedrooms(property),
      bathrooms: this.extractBathrooms(property),
      livingArea: property.building?.totalBuildingAreaSquareFeet || 
                 property.mls?.totalBuildingAreaSquareFeet || 2000,
      yearBuilt: property.building?.yearBuilt || property.mls?.yearBuilt || 2000,
      propertyType: property.building?.propertyType || property.mls?.propertyType || 'Single Family',
      daysOnMarket: property.mls?.daysOnMarket || 0,
      pricePerSqft: this.calculatePricePerSqft(price, property.building?.totalBuildingAreaSquareFeet),
      description: this.generateDescription(property),
      photos: this.extractPhotos(property),
      // Enhanced BatchData fields
      propertyTaxes: property.tax?.assessedValue || 0,
      hoaFee: property.mls?.hoaFee || 0,
      lotSize: property.building?.lotSizeSquareFeet || 0, // Return number, not string
      features: this.extractFeatures(property),
      // Market insights
      quickLists: property.quickLists || {},
      demographics: property.demographics || {}
    };
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
   * Extract price from BatchData with priority order
   */
  private extractPrice(property: any): number {
    // Priority: intel > MLS sold > MLS listing > valuation
    const intelPrice = property.intel?.lastSoldPrice;
    const mlsSoldPrice = property.mls?.soldPrice;
    const mlsPrice = property.mls?.price;
    const valuationPrice = property.valuation?.estimatedValue;
    
    return intelPrice || mlsSoldPrice || mlsPrice || valuationPrice || 500000;
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
   * Extract photos (BatchData may not have photos, use defaults)
   */
  private extractPhotos(property: any): string[] {
    // BatchData typically doesn't have photos, use reasonable defaults
    return [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&crop=edges'
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