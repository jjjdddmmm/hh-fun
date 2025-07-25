import { logger } from "@/lib/utils/logger";

// Rentcast API integration for property comparables

export interface RentcastComparable {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number; // Actual sold price, not listing price
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  soldDate?: string;
  daysOnMarket?: number;
  pricePerSqft: number;
  distance: number; // Distance from subject property in miles
  similarity: number; // Similarity score 0-100
  propertyType: string; // Property type for filtering
  isSold: boolean; // Whether this is a sold property vs active listing
  priceSource: 'sold' | 'estimate' | 'listing'; // Track whether price is from sale, estimate, or listing
  batchDataInsights?: any; // Optional BatchData-specific insights
}

export interface RentcastCompsResponse {
  comparables: RentcastComparable[];
  stats: {
    averagePrice: number;
    averagePricePerSqft: number;
    medianPrice: number;
    priceRange: {
      min: number;
      max: number;
    };
  };
}

export class RentcastAPI {
  private apiKey: string;
  private baseUrl = 'https://api.rentcast.io/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async getComparables(
    address: string,
    zipCode: string,
    bedrooms?: number,
    bathrooms?: number,
    squareFootage?: number,
    radius: number = 0.5, // Miles
    propertyType?: string
  ): Promise<RentcastCompsResponse | null> {
    try {
      
      // First validate that the subject property exists in Rentcast
      await this.validateSubjectProperty(address, zipCode);
      
      // Use the AVM/value endpoint for better property coverage
      const params = new URLSearchParams({
        address: address,
        zipCode: zipCode,
        radius: radius.toString(),
        limit: '50'
      });
      
      
      const response = await fetch(`${this.baseUrl}/avm/value?${params}`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Rentcast AVM API error:`, new Error(`HTTP ${response.status}: ${response.statusText}`));
        logger.error('Error response:', new Error(errorText));
        return null;
      }
      
      const data = await response.json();
      
      return this.formatCompsResponseWithZillow(data, propertyType, address);
      
    } catch (error) {
      logger.error('Error fetching comparables from Rentcast:', error);
      return null;
    }
  }
  
  private async validateSubjectProperty(address: string, zipCode: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        address: `${address}, ${zipCode}` // Try full address format
      });
      
      const response = await fetch(`${this.baseUrl}/property?${params}`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 404) {
        logger.warn(`⚠️  SUBJECT PROPERTY NOT FOUND IN RENTCAST: ${address}, ${zipCode}`);
        logger.warn(`⚠️  This property does not exist in Rentcast's database. Comparables search will proceed but may not include this exact address.`);
      } else if (response.ok) {
      } else {
        logger.warn(`⚠️  Could not validate subject property (status ${response.status}): ${address}`);
      }
    } catch (error) {
      logger.warn(`⚠️  Error validating subject property: ${error}`);
    }
  }

  private async getPropertyDetails(address: string, zipCode: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        address: address,
        zipcode: zipCode
      });
      
      const response = await fetch(`${this.baseUrl}/property?${params}`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        logger.error('Rentcast Property API error:', new Error(`HTTP ${response.status}: ${response.statusText}`));
        const errorText = await response.text();
        logger.error('Property error response:', new Error(errorText));
        return null;
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Error fetching property details:', error);
      return null;
    }
  }
  
  private async formatCompsResponseWithZillow(rawData: any, filterPropertyType?: string, subjectAddress?: string): Promise<RentcastCompsResponse> {
    
    // Handle AVM endpoint response structure
    const propertiesArray = rawData.comps || rawData.comparables || rawData.properties || rawData.results || rawData || [];
    
    // Log all addresses returned for debugging
    logger.debug(`🏠 All addresses returned by Rentcast AVM:`, 
      propertiesArray.map((p: any) => 
        p.address || p.addressLine1 || p.formattedAddress || 'Unknown'
      )
    );
    
    // Check if 8600 Appian Way is in the results
    const appianProperty = propertiesArray.find((p: any) => 
      (p.address || p.addressLine1 || p.formattedAddress || '').includes('8600 Appian')
    );
    if (appianProperty) {
    } else {
    }
    
    // Property type mapping between database and Rentcast API
    const propertyTypeMapping: { [key: string]: string } = {
      'SINGLE_FAMILY': 'Single Family',
      'CONDO': 'Condo',
      'TOWNHOUSE': 'Townhouse',
      'MULTI_FAMILY': 'Multi Family',
      'LAND': 'Land',
      'COMMERCIAL': 'Commercial'
    };
    
    // Convert database property type to Rentcast format for filtering
    const rentcastPropertyType = filterPropertyType ? propertyTypeMapping[filterPropertyType] || filterPropertyType : undefined;
    
    let comparables: RentcastComparable[] = [];
    
    // Process each property and enhance with Zillow data
    for (const property of propertiesArray) {
      // Exclude the subject property itself from comparables
      const propertyAddress = property.address || property.addressLine1 || property.formattedAddress || '';
      if (propertyAddress === subjectAddress) {
        continue;
      }
      
      
      // Get Zillow data for this property
      const zillowData = await this.getZillowPropertyData(propertyAddress);
      
      // Use Zillow sold price if available, otherwise use Rentcast data
      const rentcastPrice = property.price || property.value || property.estimate || 0;
      const zillowSoldPrice = zillowData?.lastSoldPrice;
      const zillowSoldDate = zillowData?.lastSoldDate;
      
      const finalPrice = zillowSoldPrice || rentcastPrice;
      const priceSource = zillowSoldPrice ? 'sold' : (rentcastPrice ? 'listing' : 'estimate');
      
      
      const comparable: RentcastComparable = {
        id: property.id || property.zpid || property.mls || 'unknown',
        address: propertyAddress,
        city: property.city || zillowData?.city || '',
        state: property.state || zillowData?.state || '',
        zipCode: property.zipCode || property.zipcode || zillowData?.zipCode || '',
        price: finalPrice,
        squareFootage: property.squareFootage || property.livingArea || property.sqft || zillowData?.squareFootage || 0,
        bedrooms: property.bedrooms || zillowData?.bedrooms || 0,
        bathrooms: property.bathrooms || zillowData?.bathrooms || 0,
        yearBuilt: property.yearBuilt || zillowData?.yearBuilt || 0,
        soldDate: zillowSoldDate || property.soldDate || property.lastSoldDate,
        daysOnMarket: property.daysOnMarket || zillowData?.daysOnMarket || 0,
        pricePerSqft: property.pricePerSquareFoot || property.pricePerSqft || 
          (finalPrice && (property.squareFootage || zillowData?.squareFootage) ? 
            Math.round(finalPrice / (property.squareFootage || zillowData?.squareFootage)) : 0),
        distance: property.distance || 0,
        similarity: property.similarityScore || property.correlation || 85,
        propertyType: property.propertyType || zillowData?.propertyType || 'Unknown',
        isSold: !!zillowSoldPrice,
        priceSource: priceSource as 'sold' | 'estimate' | 'listing'
      };
      
      comparables.push(comparable);
    }
    
    
    // Apply existing filters
    return this.applyFilters(comparables, rentcastPropertyType);
  }

  private async getZillowPropertyData(address: string): Promise<any> {
    // For now, we'll skip Zillow integration and just use Rentcast data
    // The Zillow API requires ZPID, not address, so we'd need to implement
    // a search-by-address endpoint first. For now, let's get the basic 
    // hybrid approach working with just Rentcast data.
    logger.debug(`Skipping Zillow data for ${address} - not implemented yet`);
    return null;
  }

  private applyFilters(comparables: RentcastComparable[], rentcastPropertyType?: string): RentcastCompsResponse {
    // Filter to include properties with price data
    const originalCount = comparables.length;
    comparables = comparables.filter(comp => comp.price > 0);
    logger.debug(`Filtered to properties with price data: ${originalCount} -> ${comparables.length}`);
    
    // Filter to only include recently sold properties (within last 3 years) OR active listings
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    
    const beforeDateFilter = comparables.length;
    comparables = comparables.filter(comp => {
      // Include active listings (no sold date) OR recent sales
      if (!comp.soldDate) {
        logger.debug(`Including active listing: ${comp.address}`);
        return true;
      }
      
      const soldDate = new Date(comp.soldDate);
      const isRecent = soldDate >= threeYearsAgo;
      logger.debug(`Property ${comp.address}: Sold ${soldDate.toDateString()} - ${isRecent ? 'INCLUDED' : 'EXCLUDED'}`);
      return isRecent;
    });
    
    logger.debug(`Filtered to recent sales/listings: ${beforeDateFilter} -> ${comparables.length}`);
    
    // Filter by property type if specified
    if (rentcastPropertyType) {
      const typeFilterCount = comparables.length;
      comparables = comparables.filter(comp => 
        comp.propertyType === rentcastPropertyType
      );
      logger.debug(`Filtered by property type: ${typeFilterCount} -> ${comparables.length}`);
    }
    
    logger.debug(`Final count: ${comparables.length} comparables`);
    
    // Calculate statistics
    const prices = comparables.map(c => c.price).filter(p => p > 0);
    const pricesPerSqft = comparables.map(c => c.pricePerSqft).filter(p => p > 0);
    
    return {
      comparables,
      stats: {
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
      }
    };
  }

  private formatCompsResponse(rawData: any, filterPropertyType?: string, subjectAddress?: string): RentcastCompsResponse {
    logger.debug('Formatting properties response data:', { rawData });
    logger.debug('Filtering for property type:', { filterPropertyType });
    
    // Handle properties endpoint response structure
    const propertiesArray = rawData.properties || rawData.results || rawData || [];
    logger.debug(`Found ${propertiesArray.length} properties in response`);
    
    // Log all addresses returned for debugging
    logger.debug(`🏠 All addresses returned by Rentcast:`, 
      propertiesArray.map((p: any) => 
        p.addressLine1 || p.formattedAddress || p.address || 'Unknown'
      )
    );
    
    // Check if 8600 Appian Way is in the results
    const appianProperty = propertiesArray.find((p: any) => 
      (p.addressLine1 || p.formattedAddress || p.address || '').includes('8600 Appian')
    );
    if (appianProperty) {
      logger.debug(`✅ Found 8600 Appian Way in results:`, appianProperty);
    } else {
      logger.debug(`❌ 8600 Appian Way NOT found in Rentcast results`);
    }
    
    // Property type mapping between database and Rentcast API
    const propertyTypeMapping: { [key: string]: string } = {
      'SINGLE_FAMILY': 'Single Family',
      'CONDO': 'Condo',
      'TOWNHOUSE': 'Townhouse',
      'MULTI_FAMILY': 'Multi Family',
      'LAND': 'Land',
      'COMMERCIAL': 'Commercial'
    };
    
    // Convert database property type to Rentcast format for filtering
    const rentcastPropertyType = filterPropertyType ? propertyTypeMapping[filterPropertyType] || filterPropertyType : undefined;
    
    let comparables: RentcastComparable[] = propertiesArray
      .filter((property: any) => {
        // Exclude the subject property itself from comparables
        const propertyAddress = property.addressLine1 || property.address || '';
        return propertyAddress !== subjectAddress;
      })
      .map((property: any) => {
        // Rentcast stores sale data directly in lastSalePrice and lastSaleDate fields
        const soldPrice = property.lastSalePrice;
        const soldDate = property.lastSaleDate;
        const listingPrice = property.price || property.listPrice || property.askingPrice;
        
        // Prefer sold price, but log what we're using for debugging
        const finalPrice = soldPrice || listingPrice || 0;
        
        // Enhanced logging for price debugging
        logger.debug(`Property: ${property.addressLine1 || property.address}`);
        logger.debug(`  Available price fields:`, {
          lastSoldPrice: property.lastSoldPrice,
          lastSoldDate: property.lastSoldDate,
          listingPrice: property.price || property.listPrice,
          finalPrice: finalPrice
        });
        logger.debug(`  Using final price: ${finalPrice} (source: ${soldPrice ? 'SOLD' : 'LISTING'})`);
        
        // Only include properties that have actually sold (have both sold price and sold date)
        const hasSoldData = soldPrice && soldDate;
      
        return {
          id: property.id || property.zpid || property.mls || 'unknown',
          address: property.addressLine1 || property.address || '',
          city: property.city || '',
          state: property.state || '',
          zipCode: property.zipCode || property.zipcode || '',
          price: finalPrice,
          squareFootage: property.squareFootage || property.livingArea || property.sqft || 0,
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          yearBuilt: property.yearBuilt || 0,
          soldDate: soldDate,
          daysOnMarket: property.daysOnMarket || 0,
          pricePerSqft: property.pricePerSquareFoot || property.pricePerSqft || 
            (finalPrice && property.squareFootage ? Math.round(finalPrice / property.squareFootage) : 0),
          distance: property.distance || 0,
          similarity: property.similarityScore || property.correlation || 85,
          propertyType: property.propertyType || 'Unknown',
          isSold: !!hasSoldData, // Only true if we have actual sold data
          priceSource: soldPrice ? 'sold' : 'listing' // Track price source for UI display
        };
      });
    
    // Filter to include both sold properties AND properties with listing prices
    const originalCount = comparables.length;
    comparables = comparables.filter(comp => comp.price > 0); // Just need any price data
    logger.debug(`Filtered to properties with price data: ${originalCount} -> ${comparables.length} (removed ${originalCount - comparables.length} properties without price data)`);
    
    // Filter to only include recently sold properties (within last 3 years) OR active listings
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    logger.debug(`Date filter cutoff (3 years ago): ${threeYearsAgo.toISOString()}`);
    
    const beforeDateFilter = comparables.length;
    comparables = comparables.filter(comp => {
      // Include active listings (no sold date) OR recent sales
      if (!comp.soldDate) {
        logger.debug(`Including active listing: ${comp.address}`);
        return true; // Include active listings
      }
      
      // Log the raw sold date from API
      logger.debug(`Processing soldDate: "${comp.soldDate}" (type: ${typeof comp.soldDate})`);
      
      // Parse date with robust error handling
      let soldDate = new Date(comp.soldDate);
      
      // Check if the date parsing failed
      if (isNaN(soldDate.getTime())) {
        logger.debug(`Invalid date format: ${comp.soldDate}, skipping property`);
        return false;
      }
      
      // Check if the parsed date might have a two-digit year issue (years 1950-1999 are suspicious for real estate)
      if (soldDate.getFullYear() >= 1950 && soldDate.getFullYear() <= 1999) {
        const dateStr = comp.soldDate.toString();
        logger.debug(`Detected potential 2-digit year issue: "${dateStr}" parsed as ${soldDate.getFullYear()}`);
        
        // Try to fix M/D/YY format where YY should be 20YY
        const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
        if (parts) {
          const [, month, day, year] = parts;
          const yearNum = parseInt(year);
          // For years 50-99, assume they should be 2050-2099 if they would result in future dates that are reasonable
          // Otherwise keep them as 1950-1999. For 00-49, assume 2000-2049.
          const currentYear = new Date().getFullYear();
          let fullYear;
          
          if (yearNum <= 50) {
            fullYear = 2000 + yearNum;
          } else {
            // For years 51-99, check if 20XX would be reasonable (not too far in future)
            const as20XX = 2000 + yearNum;
            const as19XX = 1900 + yearNum;
            
            // If 20XX would be more than 10 years in the future, use 19XX
            fullYear = as20XX > currentYear + 10 ? as19XX : as20XX;
          }
          
          soldDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
          logger.debug(`Fixed date: "${dateStr}" -> ${soldDate.getFullYear()}-${(soldDate.getMonth()+1).toString().padStart(2,'0')}-${soldDate.getDate().toString().padStart(2,'0')}`);
        }
      }
      
      const isRecent = soldDate >= threeYearsAgo;
      logger.debug(`Property at ${comp.address || 'unknown address'} sold on ${comp.soldDate} (parsed as ${soldDate.toISOString()}): ${isRecent ? 'INCLUDED' : 'EXCLUDED'} from recent sales filter`);
      return isRecent;
    });
    logger.debug(`Filtered to recent sales (last 3 years): ${beforeDateFilter} -> ${comparables.length} (removed ${beforeDateFilter - comparables.length} old sales)`);
    
    // Debug: Log all unique property types found in comparables
    const uniquePropertyTypes = Array.from(new Set(comparables.map(comp => comp.propertyType)));
    logger.debug('Unique property types in comparables:', { propertyTypes: uniquePropertyTypes });
    
    // Filter by property type if specified
    if (rentcastPropertyType) {
      const typeFilterCount = comparables.length;
      comparables = comparables.filter(comp => 
        comp.propertyType === rentcastPropertyType
      );
      logger.debug(`Filtered ${typeFilterCount} comparables down to ${comparables.length} matching property type: ${rentcastPropertyType}`);
    }
    
    logger.debug(`Final count: ${comparables.length} comparables`);
    
    // Calculate statistics
    const prices = comparables.map(c => c.price).filter(p => p > 0);
    const pricesPerSqft = comparables.map(c => c.pricePerSqft).filter(p => p > 0);
    
    return {
      comparables,
      stats: {
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
      }
    };
  }
}

export function createRentcastAPI(): RentcastAPI | null {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    logger.error('RENTCAST_API_KEY not found in environment variables');
    return null;
  }
  
  return new RentcastAPI(apiKey);
}