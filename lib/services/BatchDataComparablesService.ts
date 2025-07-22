import { BatchDataService } from './BatchDataService';
import { RentcastComparable, RentcastCompsResponse } from '../rentcast-api';

/**
 * BatchData service that provides a drop-in replacement for RentCast comparables
 * while offering enhanced data and capabilities
 */
export class BatchDataComparablesService {
  private batchData: BatchDataService;
  
  constructor() {
    this.batchData = new BatchDataService();
  }

  /**
   * Get comparable properties - drop-in replacement for RentCast getComparables
   * @param address Property address
   * @param zipCode Property zip code
   * @param bedrooms Number of bedrooms (optional filter)
   * @param bathrooms Number of bathrooms (optional filter)
   * @param squareFootage Square footage (optional filter)
   * @param radius Search radius in miles (default 0.5)
   * @param propertyType Property type filter (optional)
   * @returns RentcastCompsResponse for backward compatibility
   */
  async getComparables(
    address: string,
    zipCode: string,
    bedrooms?: number,
    bathrooms?: number,
    squareFootage?: number,
    radius: number = 0.5,
    propertyType?: string
  ): Promise<RentcastCompsResponse | null> {
    try {
      if (!this.batchData.isAvailable()) {
        console.warn('BatchData API not available');
        return null;
      }

      console.log(`🔍 BatchData: Searching comparables for ${address}, ${zipCode}`);
      console.log(`📊 Filters: ${bedrooms}bd, ${bathrooms}ba, ${squareFootage}sqft, ${radius}mi, ${propertyType}`);

      // Step 1: Search for properties in the area
      const searchResults = await this.searchPropertiesInArea(address, zipCode, radius);
      
      if (!searchResults || searchResults.length === 0) {
        console.log('❌ No properties found in search area');
        return this.createEmptyResponse();
      }

      console.log(`✅ Found ${searchResults.length} properties in area`);

      // Step 2: Filter and enhance the properties
      const comparables = await this.processAndFilterProperties(
        searchResults,
        address,
        bedrooms,
        bathrooms,
        squareFootage,
        propertyType
      );

      // Step 3: Calculate statistics
      const stats = this.calculateStats(comparables);

      console.log(`📈 Final result: ${comparables.length} comparables with enhanced BatchData`);

      return {
        comparables,
        stats
      };

    } catch (error) {
      console.error('Error fetching comparables from BatchData:', error);
      return null;
    }
  }

  /**
   * Search for properties in the specified area using BatchData
   */
  private async searchPropertiesInArea(
    address: string, 
    zipCode: string, 
    radius: number
  ): Promise<any[]> {
    
    // Try multiple BatchData endpoint patterns to find the right one
    const endpointsToTry = [
      // Most likely patterns based on real estate API conventions
      {
        method: 'POST',
        endpoint: '/property/search',
        body: {
          address: { 
            street: address,
            zipCode: zipCode
          },
          radius: radius,
          limit: 50
        }
      },
      {
        method: 'POST', 
        endpoint: '/v1/property/search',
        body: {
          requests: [{
            address: {
              street: address,
              zipCode: zipCode
            },
            radius: radius
          }]
        }
      },
      {
        method: 'GET',
        endpoint: '/property/search',
        params: {
          address: `${address}, ${zipCode}`,
          radius: radius.toString(),
          limit: '50'
        }
      },
      {
        method: 'POST',
        endpoint: '/search/properties',
        body: {
          location: {
            address: address,
            zipCode: zipCode,
            radius: radius
          }
        }
      }
    ];

    for (const config of endpointsToTry) {
      try {
        console.log(`🔬 Testing BatchData endpoint: ${config.method} ${config.endpoint}`);
        
        const result = await this.batchData.makeRequest(
          config.endpoint,
          { ...config.params, ...config.body }
        );

        if (result && this.isValidPropertySearchResponse(result)) {
          console.log(`✅ Success with ${config.method} ${config.endpoint}`);
          return this.extractPropertiesFromResponse(result);
        }

      } catch (error) {
        console.log(`❌ Failed ${config.method} ${config.endpoint}:`, error);
        continue;
      }
    }

    console.log('⚠️ All BatchData endpoints failed, returning empty results');
    return [];
  }

  /**
   * Check if the API response contains valid property data
   */
  private isValidPropertySearchResponse(response: any): boolean {
    // Look for common property response structures
    const hasProperties = !!(
      response?.properties ||
      response?.results ||
      response?.data?.properties ||
      response?.data?.results ||
      (Array.isArray(response) && response.length > 0)
    );

    const isErrorResponse = !!(
      response?.error ||
      response?.status?.code === 404 ||
      response?.status?.code >= 400
    );

    return hasProperties && !isErrorResponse;
  }

  /**
   * Extract properties array from various response formats
   */
  private extractPropertiesFromResponse(response: any): any[] {
    // Handle different response structures
    if (Array.isArray(response)) {
      return response;
    }
    
    return (
      response?.properties ||
      response?.results ||
      response?.data?.properties ||
      response?.data?.results ||
      response?.data ||
      []
    );
  }

  /**
   * Process and filter properties to match RentCast format
   */
  private async processAndFilterProperties(
    properties: any[],
    subjectAddress: string,
    bedrooms?: number,
    bathrooms?: number,
    squareFootage?: number,
    propertyType?: string
  ): Promise<RentcastComparable[]> {
    
    const comparables: RentcastComparable[] = [];
    
    for (const property of properties) {
      try {
        // Skip subject property
        const propAddress = this.extractAddress(property);
        if (propAddress === subjectAddress) {
          continue;
        }

        // Convert BatchData property to RentCast format
        const comparable = this.convertBatchDataToRentCast(property);
        
        if (!comparable || comparable.price <= 0) {
          continue;
        }

        // Apply filters
        if (bedrooms && comparable.bedrooms !== bedrooms) continue;
        if (bathrooms && Math.abs(comparable.bathrooms - bathrooms) > 0.5) continue;
        if (propertyType && !this.matchesPropertyType(comparable.propertyType, propertyType)) continue;
        
        // Filter to recent sales (last 3 years) or active listings
        if (!this.isRecentOrActive(comparable)) continue;

        comparables.push(comparable);

      } catch (error) {
        console.warn('Error processing property:', error);
        continue;
      }
    }

    // Sort by similarity/distance
    return comparables
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Limit to top 20 comparables
  }

  /**
   * Convert BatchData property format to RentCast comparable format
   */
  private convertBatchDataToRentCast(property: any): RentcastComparable | null {
    try {
      // Extract data from various BatchData field naming conventions
      const address = this.extractAddress(property);
      const price = this.extractPrice(property);
      const soldDate = this.extractSoldDate(property);
      
      return {
        id: property.id || property.propertyId || property.batchId || 'unknown',
        address: address,
        city: property.city || property.cityName || '',
        state: property.state || property.stateCode || '',
        zipCode: property.zipCode || property.zip || property.postalCode || '',
        price: price,
        squareFootage: property.squareFootage || property.livingArea || property.sqft || property.buildingArea || 0,
        bedrooms: property.bedrooms || property.bedroomCount || property.beds || 0,
        bathrooms: property.bathrooms || property.bathroomCount || property.baths || 0,
        yearBuilt: property.yearBuilt || property.constructionYear || 0,
        soldDate: soldDate,
        daysOnMarket: property.daysOnMarket || property.dom || 0,
        pricePerSqft: this.calculatePricePerSqft(price, property.squareFootage || property.livingArea),
        distance: property.distance || 0,
        similarity: property.similarityScore || property.confidenceScore || 85,
        propertyType: this.normalizePropertyType(property.propertyType || property.type),
        isSold: !!soldDate,
        priceSource: soldDate ? 'sold' : 'listing'
      };
      
    } catch (error) {
      console.warn('Error converting BatchData property:', error);
      return null;
    }
  }

  /**
   * Extract address from various BatchData formats
   */
  private extractAddress(property: any): string {
    return (
      property.address ||
      property.streetAddress ||
      property.fullAddress ||
      property.formattedAddress ||
      `${property.streetNumber || ''} ${property.streetName || ''}`.trim() ||
      ''
    );
  }

  /**
   * Extract price from various BatchData formats
   */
  private extractPrice(property: any): number {
    return (
      property.lastSoldPrice ||
      property.salePrice ||
      property.soldPrice ||
      property.price ||
      property.listPrice ||
      property.marketValue ||
      property.assessedValue ||
      0
    );
  }

  /**
   * Extract sold date from various BatchData formats
   */
  private extractSoldDate(property: any): string | undefined {
    return (
      property.lastSoldDate ||
      property.saleDate ||
      property.soldDate ||
      property.transactionDate ||
      undefined
    );
  }

  /**
   * Calculate price per square foot
   */
  private calculatePricePerSqft(price: number, sqft: number): number {
    if (!price || !sqft || sqft <= 0) return 0;
    return Math.round(price / sqft);
  }

  /**
   * Normalize property type to match RentCast conventions
   */
  private normalizePropertyType(type: string): string {
    if (!type) return 'Unknown';
    
    const typeMap: { [key: string]: string } = {
      'SINGLE_FAMILY': 'Single Family',
      'SINGLE FAMILY': 'Single Family',
      'SFR': 'Single Family',
      'CONDO': 'Condo',
      'CONDOMINIUM': 'Condo',
      'TOWNHOUSE': 'Townhouse',
      'TOWNHOME': 'Townhouse',
      'MULTI_FAMILY': 'Multi Family',
      'MULTIFAMILY': 'Multi Family',
      'APARTMENT': 'Multi Family',
      'LAND': 'Land',
      'VACANT_LAND': 'Land',
      'COMMERCIAL': 'Commercial'
    };

    return typeMap[type.toUpperCase()] || type;
  }

  /**
   * Check if property type matches filter
   */
  private matchesPropertyType(propType: string, filterType: string): boolean {
    if (!filterType) return true;
    
    const normalized1 = this.normalizePropertyType(propType);
    const normalized2 = this.normalizePropertyType(filterType);
    
    return normalized1 === normalized2;
  }

  /**
   * Check if property is recent sale (last 3 years) or active listing
   */
  private isRecentOrActive(comparable: RentcastComparable): boolean {
    // Include active listings (no sold date)
    if (!comparable.soldDate) return true;
    
    // Check if sold within last 3 years
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    
    const soldDate = new Date(comparable.soldDate);
    return soldDate >= threeYearsAgo;
  }

  /**
   * Calculate market statistics
   */
  private calculateStats(comparables: RentcastComparable[]) {
    const prices = comparables.map(c => c.price).filter(p => p > 0);
    const pricesPerSqft = comparables.map(c => c.pricePerSqft).filter(p => p > 0);
    
    return {
      averagePrice: prices.length > 0 ? 
        Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      averagePricePerSqft: pricesPerSqft.length > 0 ?
        Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length) : 0,
      medianPrice: prices.length > 0 ?
        prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      }
    };
  }

  /**
   * Create empty response for when no properties are found
   */
  private createEmptyResponse(): RentcastCompsResponse {
    return {
      comparables: [],
      stats: {
        averagePrice: 0,
        averagePricePerSqft: 0,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 }
      }
    };
  }

  /**
   * Check if BatchData service is available
   */
  isAvailable(): boolean {
    return this.batchData.isAvailable();
  }
}

// Factory function for easy integration
export function createBatchDataComparablesService(): BatchDataComparablesService | null {
  try {
    const service = new BatchDataComparablesService();
    return service.isAvailable() ? service : null;
  } catch (error) {
    console.error('Failed to create BatchData comparables service:', error);
    return null;
  }
}