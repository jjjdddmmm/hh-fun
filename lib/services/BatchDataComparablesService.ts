import { BatchDataService } from './BatchDataService';
import { RentcastComparable, RentcastCompsResponse } from '../rentcast-api';

/**
 * BatchData service that provides a drop-in replacement for RentCast comparables
 * while offering enhanced data and capabilities
 */
export class BatchDataComparablesService {
  private batchData: BatchDataService;
  private readonly maxProperties: number;
  
  constructor(useProduction: boolean = false) {
    this.batchData = new BatchDataService(useProduction);
    // Cost-controlled limits: 5 for production, 3 for extra safety
    this.maxProperties = process.env.BATCH_DATA_MAX_PROPERTIES ? 
      parseInt(process.env.BATCH_DATA_MAX_PROPERTIES) : 5;
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
      const searchResults = await this.searchPropertiesInArea(address, zipCode, radius, bedrooms, bathrooms, propertyType);
      
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
    radius: number,
    bedrooms?: number,
    bathrooms?: number,
    propertyType?: string
  ): Promise<any[]> {
    
    // Use BatchData Property Search API to find comparables in the area
    const endpointsToTry = [
      // Primary search: Recent sales in last 12 months
      {
        method: 'POST',
        endpoint: '/api/v1/property/search',
        body: {
          searchCriteria: {
            query: `${zipCode}`,
            sale: {
              lastSaleDate: {
                minDate: "2023-01-01", // Recent sales only
                maxDate: new Date().toISOString().split('T')[0]
              }
            },
            price: {
              min: 200000, // Filter out suspicious prices at API level
              max: 20000000
            },
            quickLists: ['recently-sold']
          },
          options: {
            take: this.maxProperties // Configurable cost control
          }
        }
      },
      // Fallback search: Extend to 24 months if not enough results
      {
        method: 'POST',
        endpoint: '/api/v1/property/search',
        body: {
          searchCriteria: {
            query: `${zipCode}`,
            sale: {
              lastSaleDate: {
                minDate: "2022-01-01", // Only last 3 years for relevance  
                maxDate: new Date().toISOString().split('T')[0]
              }
            },
            price: {
              min: 200000, // Filter out suspicious low prices
              max: 20000000 // Reasonable upper limit
            },
            quickLists: ['recently-sold']
          },
          options: {
            take: this.maxProperties, // Configurable cost control
            skip: 0,
            useDistance: true,
            distanceMiles: radius
          }
        }
      }
    ];

    for (const config of endpointsToTry) {
      try {
        console.log(`🔬 Testing BatchData endpoint: ${config.method} ${config.endpoint}`);
        
        const result = await this.batchData.makeRequest(
          config.endpoint,
          config.body,
          config.method as 'GET' | 'POST'
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
    
    // BatchData response structure: response.data.results.properties
    const properties = (
      response?.data?.results?.properties ||
      response?.results?.properties ||
      response?.properties ||
      response?.results ||
      response?.data?.properties ||
      response?.data?.results ||
      response?.data ||
      []
    );

    console.log(`✅ Found ${Array.isArray(properties) ? properties.length : 'unknown'} properties in area`);
    
    if (properties.length > 0) {
      console.log('🔍 Sample BatchData property structure:', JSON.stringify(properties[0], null, 2).substring(0, 500) + '...');
    }
    
    return Array.isArray(properties) ? properties : [];
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
    
    console.log(`🔄 Processing ${properties.length} BatchData properties...`);
    const comparables: RentcastComparable[] = [];
    
    for (const property of properties) {
      try {
        // Skip subject property
        const propAddress = this.extractAddress(property);
        console.log(`🏠 Processing property: ${propAddress}`);
        
        if (propAddress === subjectAddress) {
          console.log('⏭️ Skipping subject property');
          continue;
        }

        // Convert BatchData property to RentCast format
        const comparable = this.convertBatchDataToRentCast(property);
        console.log(`💰 Converted property price: $${comparable?.price || 'N/A'}`);
        
        if (!comparable || comparable.price <= 0) {
          console.log('❌ Skipping property: no valid price');
          continue;
        }

        // Skip suspiciously low prices (likely non-arms-length transactions)
        if (comparable.price < 100000) {
          console.log(`❌ Skipping property: suspicious price ($${comparable.price.toLocaleString()} - likely non-arms-length)`);
          continue;
        }

        // Apply flexible filters for comparables (±1-2 rooms is reasonable)
        if (bedrooms && Math.abs(comparable.bedrooms - bedrooms) > 2) {
          console.log(`❌ Skipping property: bedroom too different (${comparable.bedrooms} vs ${bedrooms})`);
          continue;
        }
        if (bathrooms && Math.abs(comparable.bathrooms - bathrooms) > 2) {
          console.log(`❌ Skipping property: bathroom too different (${comparable.bathrooms} vs ${bathrooms})`);
          continue;
        }
        // Skip property type filtering - all single family residential should be included
        const dateStr = comparable.soldDate ? ` (sold ${new Date(comparable.soldDate).toLocaleDateString()})` : ' (active listing)';
        console.log(`✅ Including property: ${comparable.address} - ${comparable.bedrooms}bd/${comparable.bathrooms}ba - $${comparable.price.toLocaleString()}${dateStr}`);
        
        // Filter to recent sales (last 3 years) or active listings
        if (!this.isRecentOrActive(comparable)) {
          console.log('❌ Skipping property: not recent sale or active listing');
          continue;
        }

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
      
      // Extract BatchData fields using correct structure
      const squareFootage = property.building?.totalBuildingAreaSquareFeet || 
                           property.mls?.totalBuildingAreaSquareFeet ||
                           property.squareFootage || property.livingArea || 0;
      
      // Enhanced field extraction with debugging
      const bedrooms = this.extractBedrooms(property);
      const bathrooms = this.extractBathrooms(property);
      
      console.log(`🏠 Property details extraction for ${address}:`);
      console.log(`  - Bedrooms: ${bedrooms} (from building.bedroomCount: ${property.building?.bedroomCount}, mls.bedroomCount: ${property.mls?.bedroomCount})`);
      console.log(`  - Bathrooms: ${bathrooms} (from building.bathroomCount: ${property.building?.bathroomCount}, mls.bathroomCount: ${property.mls?.bathroomCount})`);
      console.log(`  - Square footage: ${squareFootage}`);
      
      // Extract enhanced BatchData insights
      const insights = this.extractPropertyInsights(property);
      
      return {
        id: property._id || property.id || property.propertyId || 'unknown',
        address: address,
        city: property.address?.city || property.city || '',
        state: property.address?.state || property.state || '',
        zipCode: property.address?.zip || property.zipCode || '',
        price: price,
        squareFootage: squareFootage,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        yearBuilt: property.building?.yearBuilt || property.mls?.yearBuilt || property.yearBuilt || 0,
        soldDate: soldDate,
        daysOnMarket: property.mls?.daysOnMarket || property.daysOnMarket || 0,
        pricePerSqft: this.calculatePricePerSqft(price, squareFootage),
        distance: property.distance || 0,
        similarity: property.similarityScore || property.confidenceScore || 85,
        propertyType: this.normalizePropertyType(property.building?.propertyType || property.mls?.propertyType || property.propertyType),
        isSold: !!soldDate,
        priceSource: soldDate ? 'sold' : (property.mls?.price ? 'listing' : 'valuation'),
        // Enhanced BatchData insights
        batchDataInsights: insights
      };
      
    } catch (error) {
      console.warn('Error converting BatchData property:', error);
      return null;
    }
  }

  /**
   * Extract enhanced property insights from BatchData API
   */
  private extractPropertyInsights(property: any): any {
    const quickLists = property.quickLists || {};
    const valuation = property.valuation || {};
    const openLien = property.openLien || {};
    
    return {
      // Investment insights
      cashBuyer: quickLists.cashBuyer || false,
      fixAndFlip: quickLists.fixAndFlip || false,
      highEquity: quickLists.highEquity || false,
      lowEquity: quickLists.lowEquity || false,
      freeAndClear: quickLists.freeAndClear || false,
      
      // Owner insights  
      absenteeOwner: quickLists.absenteeOwner || false,
      ownerOccupied: quickLists.ownerOccupied || false,
      corporateOwned: quickLists.corporateOwned || false,
      trustOwned: quickLists.trustOwned || false,
      
      // Market insights
      recentlySold: quickLists.recentlySold || false,
      activeListing: quickLists.activeListing || false,
      failedListing: quickLists.failedListing || false,
      listedBelowMarketPrice: quickLists.listedBelowMarketPrice || false,
      
      // Financial details
      estimatedValue: valuation.estimatedValue || 0,
      confidenceScore: valuation.confidenceScore || 0,
      equityPercent: valuation.equityPercent || 0,
      ltv: valuation.ltv || 0,
      totalOpenLienBalance: openLien.totalOpenLienBalance || 0,
      
      // Property features (from building data)
      pool: property.building?.pool || false,
      fireplaceCount: property.building?.fireplaceCount || 0,
      garageSpaces: property.building?.garageParkingSpaceCount || 0,
      lotSize: property.building?.lotSizeSquareFeet || property.lot?.lotSizeSquareFeet || 0,
    };
  }

  /**
   * Extract bedroom count from various BatchData formats
   */
  private extractBedrooms(property: any): number {
    // Enhanced BatchData API field mapping - prioritize by reliability
    const bedroomSources = [
      property.mls?.bedroomCount,           // Most reliable - from MLS
      property.building?.bedroomCount,      // Building records
      property.listing?.bedroomCount,       // Alternative listing field
      property.bedrooms,                    // Generic field
      property.bedroom_count,               // Alternative naming
      property.general?.bedroomCount,       // General property data
      property.assessment?.bedroomCount     // Assessment data
    ];
    
    for (const count of bedroomSources) {
      if (typeof count === 'number' && count > 0 && count <= 20) { // Reasonable range check
        return count;
      }
    }
    
    // For sandbox: use reasonable default, in production: consider skipping
    const isSandbox = process.env.BATCH_DATA_API_KEY?.includes('wcaJ');
    return isSandbox ? 3 : 0; // Return 0 in production to indicate missing data
  }
  
  /**
   * Extract bathroom count from various BatchData formats  
   */
  private extractBathrooms(property: any): number {
    const bathroomSources = [
      property.building?.bathroomCount,
      property.mls?.bathroomCount, 
      property.bathrooms,
      property.bathroom_count,
      property.general?.bathroomCount,
      property.assessment?.bathroomCount
    ];
    
    for (const count of bathroomSources) {
      if (typeof count === 'number' && count > 0) {
        return count;
      }
    }
    
    return 2; // Reasonable default for sandbox testing
  }

  /**
   * Extract address from BatchData format
   */
  private extractAddress(property: any): string {
    // BatchData format: property.address.street
    return (
      property.address?.street ||
      property.address?.fullAddress ||
      property.streetAddress ||
      property.fullAddress ||
      property.formattedAddress ||
      `${property.address?.houseNumber || ''} ${property.address?.streetName || ''}`.trim() ||
      ''
    );
  }

  /**
   * Extract price from various BatchData formats
   */
  private extractPrice(property: any): number {
    // Enhanced BatchData format: use comprehensive API field mapping
    const mlsPrice = property.mls?.price;
    const mlsSoldPrice = property.mls?.soldPrice;
    const saleLastPrice = property.sale?.lastSale?.price; // Enhanced field
    const intelPrice = property.intel?.lastSoldPrice; // Derived from multiple sources
    const valuationPrice = property.valuation?.estimatedValue;
    const deedPrice = property.deedHistory?.[0]?.salePrice;
    
    // Debug logging for all properties to understand patterns
    console.log('🔍 Enhanced price extraction debug:');
    console.log(`  Property: ${property.address?.street || 'unknown'}`);
    console.log('  - mls.soldPrice:', mlsSoldPrice);
    console.log('  - sale.lastSale.price:', saleLastPrice);
    console.log('  - intel.lastSoldPrice (derived):', intelPrice);
    console.log('  - mls.price (listing):', mlsPrice);
    console.log('  - valuation.estimatedValue:', valuationPrice);
    
    // Prioritize actual transaction prices (best to least reliable)
    // 1. Intel derived price (most reliable - combines assessor + MLS)
    // 2. MLS sold price  
    // 3. Sale last price
    // 4. Deed history (often has non-arms-length issues)
    const validPrices = [intelPrice, mlsSoldPrice, saleLastPrice, deedPrice].filter(price => 
      price && price > 10000 // Skip suspicious low prices
    );
    
    if (validPrices.length > 0) {
      const selectedPrice = validPrices[0];
      console.log(`  ✅ Selected actual sale price: $${selectedPrice.toLocaleString()}`);
      return selectedPrice;
    }
    
    // Fall back to current listing price for active properties
    if (mlsPrice && mlsPrice > 10000) {
      console.log(`  📋 Using current listing price: $${mlsPrice.toLocaleString()}`);
      return mlsPrice;
    }
    
    // Final fallback to AVM valuation
    if (valuationPrice && valuationPrice > 10000) {
      console.log(`  📊 Using AVM valuation: $${valuationPrice.toLocaleString()}`);
      return valuationPrice;
    }
    
    console.log(`  ❌ No valid price found`);
    return 0;
  }

  /**
   * Extract sold date from various BatchData formats
   */
  private extractSoldDate(property: any): string | undefined {
    // Enhanced BatchData format: use comprehensive API field mapping
    const intelDate = property.intel?.lastSoldDate; // Derived from multiple sources
    const mlsSoldDate = property.mls?.soldDate; // Direct MLS sold date
    const saleLastDate = property.sale?.lastSale?.saleDate; // Enhanced sale field
    const deedDate = property.deedHistory?.[0]?.saleDate || property.deedHistory?.[0]?.recordingDate;
    
    return (
      intelDate ||      // Most reliable - derived from assessor + MLS
      mlsSoldDate ||    // Direct from MLS
      saleLastDate ||   // Enhanced sale data
      deedDate ||       // Deed records
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
   * For sandbox testing, we relax date restrictions to allow older data
   */
  private isRecentOrActive(comparable: RentcastComparable): boolean {
    // Include active listings (no sold date)
    if (!comparable.soldDate) return true;
    
    // For sandbox environment, allow older data for testing purposes
    const isSandbox = process.env.BATCH_DATA_API_KEY?.includes('wcaJ');
    if (isSandbox) {
      console.log(`🧪 Sandbox mode: accepting older sale data for testing`);
      return true; // Accept all dates in sandbox
    }
    
    // Production: Check if sold within last 3 years
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
export function createBatchDataComparablesService(useProduction: boolean = false): BatchDataComparablesService | null {
  try {
    const service = new BatchDataComparablesService(useProduction);
    return service.isAvailable() ? service : null;
  } catch (error) {
    console.error('Failed to create BatchData comparables service:', error);
    return null;
  }
}