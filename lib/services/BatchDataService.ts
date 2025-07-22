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

  constructor() {
    this.apiKey = process.env.BATCH_DATA_API_KEY || '';
    this.baseUrl = 'https://api.batchdata.com'; // Base URL - we'll discover the right endpoints
    
    if (!this.apiKey) {
      console.warn('BatchData API key not found in environment variables');
    }
  }

  async makeRequest<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<BatchDataResponse<T>> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'BatchData API key not configured'
      };
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      
      // Add query parameters
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`BatchData API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          requestId: response.headers.get('x-request-id') || '',
          timestamp: new Date().toISOString(),
          dataSource: 'BatchData',
          confidence: 85 // Default confidence, may be provided by API
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
}