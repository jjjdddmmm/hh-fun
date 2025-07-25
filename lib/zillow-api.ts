import { logger } from "@/lib/utils/logger";

// Clean Zillow API integration via RapidAPI

export interface ZillowPropertyData {
  zpid: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  priceHistory?: Array<{
    date: string;
    price: number;
    event: string;
  }>;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  yearBuilt: number;
  lotSize?: number;
  propertyType: string;
  daysOnZillow?: number;
  pricePerSqft?: number;
  zestimate?: {
    amount: number;
    valuationRange: {
      low: number;
      high: number;
    };
  };
  rentZestimate?: number;
  rentZestimateRangeLow?: number;
  rentZestimateRangeHigh?: number;
  propertyTaxes?: number;
  hoaFee?: number;
  photos?: string[];
  description?: string;
  features?: {
    hasPool?: boolean;
    hasGarage?: boolean;
    hasFireplace?: boolean;
    hasCentralAir?: boolean;
    hasBasement?: boolean;
    hasHardwoodFloors?: boolean;
  };
  schoolData?: {
    district: string;
    elementary?: string;
    middle?: string;
    high?: string;
  };
}

export class ZillowAPI {
  private apiKey: string;
  private baseUrl = 'https://zillow-com1.p.rapidapi.com';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Zillow API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getPropertyByZpid(zpid: string): Promise<ZillowPropertyData | null> {
    try {
      const data = await this.makeRequest('/property', { zpid });
      
      if (!data || !data.zpid) {
        return null;
      }
      
      // Keep only essential logging for production monitoring
      if (!data || !data.zpid) {
      }
      
      return this.normalizePropertyData(data);
    } catch (error) {
      logger.error('Error fetching property from Zillow:', error);
      return null;
    }
  }
  
  async getPropertyExtended(zpid: string): Promise<any> {
    try {
      return await this.makeRequest('/propertyExtendedSearch', { zpid });
    } catch (error) {
      logger.error('Error fetching extended property data:', error);
      return null;
    }
  }
  
  private extractPhotos(rawData: any): string[] {
    // Extract photos from various possible fields
    
    const photos: string[] = [];
    
    // Check for various photo fields in the API response
    if (rawData.photos && Array.isArray(rawData.photos)) {
      const extractedPhotos = rawData.photos.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    if (rawData.imgSrc) {
      photos.push(rawData.imgSrc);
    }
    
    if (rawData.miniCardPhotos && Array.isArray(rawData.miniCardPhotos)) {
      const extractedPhotos = rawData.miniCardPhotos.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    if (rawData.neighborhoodMapThumb && Array.isArray(rawData.neighborhoodMapThumb)) {
      const extractedPhotos = rawData.neighborhoodMapThumb.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    // Try additional photo fields
    if (rawData.image) {
      photos.push(rawData.image);
    }
    
    if (rawData.images && Array.isArray(rawData.images)) {
      const extractedPhotos = rawData.images.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    if (rawData.photo) {
      photos.push(rawData.photo);
    }
    
    if (rawData.propertyPhotos && Array.isArray(rawData.propertyPhotos)) {
      const extractedPhotos = rawData.propertyPhotos.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    if (rawData.listingPhotos && Array.isArray(rawData.listingPhotos)) {
      const extractedPhotos = rawData.listingPhotos.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    if (rawData.gallery && Array.isArray(rawData.gallery)) {
      const extractedPhotos = rawData.gallery.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    if (rawData.mediaGallery && Array.isArray(rawData.mediaGallery)) {
      const extractedPhotos = rawData.mediaGallery.map((photo: any) => photo.url || photo);
      photos.push(...extractedPhotos);
    }
    
    // Separate property photos from street view/map images
    const propertyPhotos = photos.filter(url => 
      !url.includes('streetview') && 
      !url.includes('staticmap') && 
      !url.includes('maps.googleapis.com')
    );
    
    const streetViewPhotos = photos.filter(url => 
      url.includes('streetview') || 
      url.includes('staticmap') || 
      url.includes('maps.googleapis.com')
    );
    
    // Prefer property photos, but use street view as fallback if no property photos
    const finalPhotos = propertyPhotos.length > 0 ? propertyPhotos : streetViewPhotos;
    
    // Add fallback image if no photos found
    if (finalPhotos.length === 0) {
      finalPhotos.push('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges');
    }
    
    return finalPhotos;
  }

  private parseLotSize(lotSizeStr: string | number | undefined): number | undefined {
    if (!lotSizeStr) return undefined;
    if (typeof lotSizeStr === 'number') return lotSizeStr;
    
    // Remove commas and non-numeric characters except decimal points
    const cleaned = lotSizeStr.toString().replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }

  private normalizePropertyData(rawData: any): ZillowPropertyData {
    const address = rawData.address || {};
    const price = rawData.price || rawData.zestimate?.amount || 0;
    
    return {
      zpid: rawData.zpid.toString(),
      address: `${address.streetAddress || ''}, ${address.city || ''}, ${address.state || ''} ${address.zipcode || ''}`.trim(),
      city: address.city || '',
      state: address.state || '',
      zipcode: address.zipcode || '',
      price: price,
      bedrooms: rawData.bedrooms || 0,
      bathrooms: rawData.bathrooms || 0,
      livingArea: rawData.livingArea || rawData.sqft || 0,
      yearBuilt: rawData.yearBuilt || 0,
      lotSize: this.parseLotSize(rawData.lotSize || rawData.lotSizeValue || 
              (rawData.resoFacts?.lotSize) || 
              (rawData.homeInsights?.lotSize) ||
              (rawData.building?.lotSize) ||
              (rawData.homeFacts?.lotSize)),
      propertyType: rawData.propertyType || rawData.homeType || 
                   (rawData.resoFacts?.propertyType) || 
                   (rawData.homeInsights?.propertyType) ||
                   (rawData.building?.propertyType) ||
                   (rawData.homeFacts?.propertyType) || 'Unknown',
      daysOnZillow: rawData.daysOnZillow,
      pricePerSqft: rawData.pricePerSqft || (price && rawData.livingArea ? Math.round(price / rawData.livingArea) : undefined),
      zestimate: rawData.zestimate ? {
        amount: rawData.zestimate,
        valuationRange: {
          low: rawData.zestimate * (1 - (rawData.zestimateLowPercent || 5) / 100),
          high: rawData.zestimate * (1 + (rawData.zestimateHighPercent || 5) / 100)
        }
      } : undefined,
      rentZestimate: rawData.rentZestimate || rawData.rentEstimate || rawData.monthlyRent,
      rentZestimateRangeLow: rawData.rentZestimate ? rawData.rentZestimate * 0.9 : undefined,
      rentZestimateRangeHigh: rawData.rentZestimate ? rawData.rentZestimate * 1.1 : undefined,
      propertyTaxes: rawData.propertyTaxes || rawData.taxHistory?.[0]?.taxPaid,
      hoaFee: rawData.hoaFee || rawData.monthlyHoaFee || 
              (rawData.resoFacts?.hoaFee) || 
              (rawData.homeInsights?.hoaFee) ||
              (rawData.building?.hoaFee) ||
              (rawData.homeFacts?.hoaFee),
      photos: this.extractPhotos(rawData),
      description: rawData.description,
      features: {
        hasPool: rawData.hasPool,
        hasGarage: rawData.hasGarage || (rawData.parkingFeatures && rawData.parkingFeatures.length > 0),
        hasFireplace: rawData.hasFireplace,
        hasCentralAir: rawData.hasCentralAir,
        hasBasement: rawData.hasBasement,
        hasHardwoodFloors: rawData.hasHardwoodFloors
      },
      schoolData: rawData.schools ? {
        district: rawData.schools.district,
        elementary: rawData.schools.elementary?.name,
        middle: rawData.schools.middle?.name,
        high: rawData.schools.high?.name
      } : undefined,
      priceHistory: rawData.priceHistory || []
    };
  }
}

export function createZillowAPI(): ZillowAPI | null {
  const apiKey = process.env.ZILLOW_API_KEY;
  if (!apiKey) {
    logger.error('ZILLOW_API_KEY not found in environment variables');
    return null;
  }
  
  return new ZillowAPI(apiKey);
}