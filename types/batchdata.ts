// BatchData API Response Types

export interface BatchDataProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude?: number;
  longitude?: number;
  
  // Property Details
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  
  // Valuation
  estimatedValue?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  
  // Market Data
  daysOnMarket?: number;
  listPrice?: number;
  priceHistory?: PriceHistoryItem[];
  
  // Owner Information
  ownerName?: string;
  ownerOccupied?: boolean;
  ownershipLength?: number;
  
  // Property Characteristics
  features?: string[];
  condition?: string;
  neighborhood?: string;
}

export interface PriceHistoryItem {
  date: string;
  price: number;
  event: 'listing' | 'sale' | 'price_change' | 'delisted';
  source?: string;
}

export interface BatchDataComparable {
  property: BatchDataProperty;
  distance: number; // in miles
  similarity: number; // 0-1 score
  adjustedPrice?: number;
  adjustments?: {
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    condition?: number;
    location?: number;
  };
}

export interface BatchDataMarketAnalysis {
  medianPrice: number;
  averagePrice: number;
  pricePerSquareFoot: number;
  daysOnMarket: number;
  salesVolume: number;
  inventoryLevel: number;
  marketTrend: 'hot' | 'warm' | 'balanced' | 'cool' | 'cold';
  priceChangePercent: number;
  comparableSales: BatchDataComparable[];
  marketScore: number; // 1-100
}

export interface BatchDataNeighborhoodInfo {
  name: string;
  boundaries?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  demographics?: {
    medianIncome?: number;
    averageAge?: number;
    homeOwnershipRate?: number;
  };
  amenities?: {
    schools?: SchoolInfo[];
    parks?: AmenityInfo[];
    shopping?: AmenityInfo[];
    restaurants?: AmenityInfo[];
    transportation?: AmenityInfo[];
  };
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
}

export interface SchoolInfo {
  name: string;
  type: 'elementary' | 'middle' | 'high';
  rating?: number;
  distance: number;
}

export interface AmenityInfo {
  name: string;
  type: string;
  distance: number;
  rating?: number;
}

export interface BatchDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    dataSource: string;
    confidence: number;
    propertiesReturned?: number;
    estimatedCost?: number;
  };
}

// API Endpoint Types
export interface PropertySearchParams {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  radius?: number; // in miles
  propertyType?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSquareFootage?: number;
  maxSquareFootage?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
}

export interface ComparablesParams {
  address: string;
  radius?: number; // default 0.5 miles
  limit?: number; // default 10
  timeframe?: number; // months, default 12
  propertyTypes?: string[];
  adjustForDifferences?: boolean;
}

export interface MarketAnalysisParams {
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  radius?: number;
  timeframe?: number; // months
}