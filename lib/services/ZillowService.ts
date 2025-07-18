import { ZillowAPI, ZillowPropertyData, createZillowAPI } from '../zillow-api';
import { apiCache } from '../cache';
import { zillowRateLimiter } from '../rate-limiter';

export class ZillowService {
  private api: ZillowAPI | null;

  constructor() {
    this.api = createZillowAPI();
  }

  async getPropertyData(zpid: string): Promise<ZillowPropertyData | null> {
    if (!this.api) {
      throw new Error('Zillow API not available - check API key configuration');
    }

    // Check cache first
    const cacheKey = `zillow_property_${zpid}`;
    const cachedData = apiCache.get<ZillowPropertyData>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // Check rate limit
    if (!zillowRateLimiter.isAllowed('zillow_api')) {
      throw new Error('Zillow API rate limit exceeded. Please try again later.');
    }

    try {
      const propertyData = await this.api.getPropertyByZpid(zpid);
      
      if (!propertyData) {
        console.warn(`No property data found for ZPID: ${zpid}`);
        return null;
      }

      // Cache for 15 minutes
      apiCache.set(cacheKey, propertyData, 15 * 60 * 1000);
      
      return propertyData;
    } catch (error) {
      console.error(`Failed to fetch property data for ZPID ${zpid}:`, error);
      throw error;
    }
  }

  async getExtendedPropertyData(zpid: string): Promise<any> {
    if (!this.api) {
      throw new Error('Zillow API not available - check API key configuration');
    }

    // Check cache first
    const cacheKey = `zillow_extended_${zpid}`;
    const cachedData = apiCache.get<any>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // Check rate limit
    if (!zillowRateLimiter.isAllowed('zillow_api')) {
      throw new Error('Zillow API rate limit exceeded. Please try again later.');
    }

    try {
      const extendedData = await this.api.getPropertyExtended(zpid);
      
      // Cache for 30 minutes
      apiCache.set(cacheKey, extendedData, 30 * 60 * 1000);
      
      return extendedData;
    } catch (error) {
      console.error(`Failed to fetch extended property data for ZPID ${zpid}:`, error);
      throw error;
    }
  }

  validatePropertyData(data: ZillowPropertyData): boolean {
    return !!(
      data.zpid &&
      data.address &&
      data.price &&
      data.livingArea &&
      data.yearBuilt
    );
  }

  isApiAvailable(): boolean {
    return this.api !== null;
  }
}

export function createZillowService(): ZillowService {
  return new ZillowService();
}