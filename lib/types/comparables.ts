// Types for comparable properties and area data

export interface ComparableProperty {
  id: string;
  address: string;
  price: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  daysOnMarket: number;
  pricePerSqft: number;
  distance: number; // Distance from target property in miles
  similarity: number; // Similarity score 0-1
  listingDate?: string;
  soldDate?: string;
  status: 'active' | 'sold' | 'pending';
}

export interface ComparablesData {
  targetProperty: {
    id: string;
    address: string;
    price: number;
  };
  comparables: ComparableProperty[];
  analysis: {
    averagePrice: number;
    averagePricePerSqft: number;
    priceRange: {
      min: number;
      max: number;
    };
    marketPosition: 'underpriced' | 'fairly_priced' | 'overpriced';
    confidenceScore: number;
  };
  generatedAt: string;
}

export interface MarketMetrics {
  medianHomeValue: number;
  averageDaysOnMarket: number;
  pricePerSqft: number;
  marketTrend: 'rising' | 'stable' | 'declining';
  inventoryLevel: 'low' | 'balanced' | 'high';
  demandIndex: number; // 0-100
}

export interface DemographicData {
  population: number;
  medianAge: number;
  medianHouseholdIncome: number;
  employmentRate: number;
  educationLevel: {
    highSchool: number;
    bachelors: number;
    graduate: number;
  };
}

export interface NeighborhoodAmenities {
  schools: {
    elementary: number;
    middle: number;
    high: number;
    averageRating: number;
  };
  transportation: {
    walkScore: number;
    transitScore: number;
    bikeScore: number;
  };
  safety: {
    crimeIndex: number;
    safetyRating: number;
  };
  recreation: {
    parks: number;
    restaurants: number;
    shopping: number;
  };
}

export interface AreaData {
  location: {
    city: string;
    state: string;
    zipCode: string;
    county: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  marketMetrics: MarketMetrics;
  demographics: DemographicData;
  amenities: NeighborhoodAmenities;
  trends: {
    priceAppreciation: {
      oneYear: number;
      threeYear: number;
      fiveYear: number;
    };
    marketActivity: {
      salesVolume: number;
      newListings: number;
      priceReductions: number;
    };
  };
  generatedAt: string;
}