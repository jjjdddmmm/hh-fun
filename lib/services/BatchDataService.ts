import {
  BatchDataProperty,
  BatchDataComparable,
  BatchDataMarketAnalysis,
  BatchDataNeighborhoodInfo,
  BatchDataResponse,
  PropertySearchParams,
  ComparablesParams,
  MarketAnalysisParams
} from '@/types/batchdata';

export class BatchDataService {
  private apiKey: string;
  private baseUrl: string;

  constructor(useProduction: boolean = false) {
    // Allow easy switching between sandbox and production
    if (useProduction) {
      this.apiKey = process.env.BATCH_DATA_PRODUCTION_API_KEY || '';
      console.log('🏭 Using BatchData PRODUCTION API');
    } else {
      this.apiKey = process.env.BATCH_DATA_SANDBOX_API_KEY || process.env.BATCH_DATA_API_KEY || '';
      console.log('🧪 Using BatchData SANDBOX API');
    }
    
    this.baseUrl = 'https://api.batchdata.com';
    
    if (!this.apiKey) {
      console.warn('BatchData API key not found in environment variables');
    }
  }

  async makeRequest<T>(
    endpoint: string,
    params?: Record<string, any>,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<BatchDataResponse<T>> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'BatchData API key not configured'
      };
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      
      // Debug logging
      console.log(`🔐 BatchData request to ${endpoint} with API key ending in: ...${this.apiKey?.slice(-4) || 'MISSING'}`);
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      if (method === 'GET' && params) {
        // Add query parameters for GET requests
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      } else if (method === 'POST' && params) {
        // Add body for POST requests
        requestOptions.body = JSON.stringify(params);
        console.log(`📤 Request body:`, JSON.stringify(params).substring(0, 200) + '...');
      }

      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ BatchData API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`BatchData API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Track API usage for cost monitoring
      await this.trackUsage(endpoint, params, data);

      return {
        success: true,
        data,
        metadata: {
          requestId: response.headers.get('x-request-id') || '',
          timestamp: new Date().toISOString(),
          dataSource: 'BatchData',
          confidence: 85, // Default confidence, may be provided by API
          propertiesReturned: this.countProperties(data),
          estimatedCost: this.estimateCost(data)
        }
      };
    } catch (error) {
      console.error('BatchData API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test API connection
  async testConnection(): Promise<BatchDataResponse<any>> {
    return this.makeRequest('/test');
  }

  // Get property details by address
  async getPropertyByAddress(address: string): Promise<BatchDataResponse<BatchDataProperty>> {
    return this.makeRequest('/property/search', { address });
  }

  // Search properties with filters
  async searchProperties(params: PropertySearchParams): Promise<BatchDataResponse<BatchDataProperty[]>> {
    return this.makeRequest('/property/search', params);
  }

  // Get comparable sales for a property
  async getComparables(params: ComparablesParams): Promise<BatchDataResponse<BatchDataComparable[]>> {
    return this.makeRequest('/property/comparables', params);
  }

  // Get market analysis for an area
  async getMarketAnalysis(params: MarketAnalysisParams): Promise<BatchDataResponse<BatchDataMarketAnalysis>> {
    return this.makeRequest('/market/analysis', params);
  }

  // Get neighborhood information
  async getNeighborhoodInfo(address: string): Promise<BatchDataResponse<BatchDataNeighborhoodInfo>> {
    return this.makeRequest('/neighborhood/info', { address });
  }

  // Get property ownership history
  async getOwnershipHistory(address: string): Promise<BatchDataResponse<any>> {
    return this.makeRequest('/property/ownership', { address });
  }

  // Get off-market properties (pre-foreclosure, etc.)
  async getOffMarketProperties(params: PropertySearchParams): Promise<BatchDataResponse<BatchDataProperty[]>> {
    return this.makeRequest('/property/off-market', params);
  }

  // Get property tax information
  async getPropertyTaxInfo(address: string): Promise<BatchDataResponse<any>> {
    return this.makeRequest('/property/taxes', { address });
  }

  // Get rental estimates and analysis
  async getRentalAnalysis(address: string): Promise<BatchDataResponse<any>> {
    return this.makeRequest('/property/rental-analysis', { address });
  }

  // Check if service is available
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  // Validate address format
  private validateAddress(address: string): boolean {
    // Basic address validation
    return address.length > 10 && /\d/.test(address);
  }

  // Format address for API consistency
  private formatAddress(address: string): string {
    return address.trim().replace(/\s+/g, ' ');
  }

  // Get enhanced property data (combines multiple endpoints)
  async getEnhancedPropertyData(address: string): Promise<{
    property: BatchDataProperty | null;
    comparables: BatchDataComparable[];
    marketAnalysis: BatchDataMarketAnalysis | null;
    neighborhood: BatchDataNeighborhoodInfo | null;
    confidence: number;
  }> {
    const formattedAddress = this.formatAddress(address);
    
    if (!this.validateAddress(formattedAddress)) {
      throw new Error('Invalid address format');
    }

    // Make parallel requests for comprehensive data
    const [propertyResult, comparablesResult, marketResult, neighborhoodResult] = await Promise.allSettled([
      this.getPropertyByAddress(formattedAddress),
      this.getComparables({ address: formattedAddress, limit: 10 }),
      this.getMarketAnalysis({ address: formattedAddress }),
      this.getNeighborhoodInfo(formattedAddress)
    ]);

    // Extract successful results
    const property = propertyResult.status === 'fulfilled' && propertyResult.value.success 
      ? propertyResult.value.data || null 
      : null;
    
    const comparables = comparablesResult.status === 'fulfilled' && comparablesResult.value.success 
      ? comparablesResult.value.data || []
      : [];
    
    const marketAnalysis = marketResult.status === 'fulfilled' && marketResult.value.success 
      ? marketResult.value.data || null 
      : null;
    
    const neighborhood = neighborhoodResult.status === 'fulfilled' && neighborhoodResult.value.success 
      ? neighborhoodResult.value.data || null 
      : null;

    // Calculate overall confidence based on successful data retrieval
    const successfulRequests = [property, comparables.length > 0, marketAnalysis, neighborhood].filter(Boolean).length;
    const confidence = (successfulRequests / 4) * 100;

    return {
      property,
      comparables,
      marketAnalysis,
      neighborhood,
      confidence
    };
  }

  /**
   * Track BatchData API usage for cost monitoring
   */
  private async trackUsage(endpoint: string, params: any, response: any): Promise<void> {
    try {
      const propertiesCount = this.countProperties(response);
      const estimatedCost = this.estimateCost(response);

      // Log usage (you could also save to database)
      console.log(`📊 BatchData Usage: ${endpoint} - ${propertiesCount} properties - ~$${estimatedCost.toFixed(2)}`);

      // TODO: Save to database for proper tracking
      // await prisma.batchDataUsage.create({
      //   data: {
      //     endpoint,
      //     propertiesCount,
      //     estimatedCost,
      //     timestamp: new Date(),
      //     params: JSON.stringify(params)
      //   }
      // });
    } catch (error) {
      console.warn('Failed to track BatchData usage:', error);
    }
  }

  /**
   * Count properties returned in response
   */
  private countProperties(response: any): number {
    if (Array.isArray(response)) return response.length;
    
    const properties = (
      response?.results?.properties ||
      response?.data?.results?.properties ||
      response?.data?.properties ||
      response?.properties ||
      []
    );
    
    return Array.isArray(properties) ? properties.length : 0;
  }

  /**
   * Estimate cost based on properties returned
   */
  private estimateCost(response: any): number {
    const propertiesCount = this.countProperties(response);
    const costPerProperty = 0.46; // Updated to actual cost observed: 46¢ per property
    return propertiesCount * costPerProperty;
  }
}