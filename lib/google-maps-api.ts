// Google Maps API integration for area/neighborhood data

export interface PlaceInfo {
  name: string;
  type: string;
  rating?: number;
  distance: number; // in meters
  address?: string;
}

export interface AreaAnalysis {
  schools: {
    elementary: PlaceInfo[];
    middle: PlaceInfo[];
    high: PlaceInfo[];
  };
  amenities: {
    groceryStores: PlaceInfo[];
    restaurants: PlaceInfo[];
    parks: PlaceInfo[];
    hospitals: PlaceInfo[];
    publicTransit: PlaceInfo[];
  };
  walkScore?: number;
  crimeRate?: string;
  demographics?: {
    medianIncome?: number;
    population?: number;
  };
}

export class GoogleMapsAPI {
  private apiKey: string;
  private placesBaseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  private geocodeBaseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async getAreaAnalysis(address: string, zipCode: string): Promise<AreaAnalysis | null> {
    try {
      // First, geocode the address to get coordinates
      const coords = await this.geocodeAddress(`${address}, ${zipCode}`);
      if (!coords) {
        console.error('Could not geocode address');
        return null;
      }
      
      // Fetch various types of places nearby
      const [
        elementarySchools,
        middleSchools,
        highSchools,
        groceryStores,
        restaurants,
        parks,
        hospitals,
        transitStations
      ] = await Promise.all([
        this.searchNearby(coords, 'elementary school', 3000),
        this.searchNearby(coords, 'middle school', 5000),
        this.searchNearby(coords, 'high school', 5000),
        this.searchNearby(coords, 'grocery store', 2000),
        this.searchNearby(coords, 'restaurant', 1000),
        this.searchNearby(coords, 'park', 2000),
        this.searchNearby(coords, 'hospital', 5000),
        this.searchNearby(coords, 'transit station', 2000)
      ]);
      
      return {
        schools: {
          elementary: elementarySchools.slice(0, 3),
          middle: middleSchools.slice(0, 3),
          high: highSchools.slice(0, 3)
        },
        amenities: {
          groceryStores: groceryStores.slice(0, 5),
          restaurants: restaurants.slice(0, 10),
          parks: parks.slice(0, 5),
          hospitals: hospitals.slice(0, 3),
          publicTransit: transitStations.slice(0, 5)
        },
        walkScore: this.calculateWalkScore(groceryStores, restaurants, parks, transitStations),
        crimeRate: 'Data not available', // Would need separate crime API
        demographics: {
          medianIncome: undefined,
          population: undefined
        }
      };
      
    } catch (error) {
      console.error('Error fetching area analysis:', error);
      return null;
    }
  }
  
  private async geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
    try {
      const params = new URLSearchParams({
        address: address,
        key: this.apiKey
      });
      
      const response = await fetch(`${this.geocodeBaseUrl}?${params}`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
  
  private async searchNearby(
    coords: {lat: number, lng: number}, 
    type: string, 
    radius: number
  ): Promise<PlaceInfo[]> {
    try {
      const params = new URLSearchParams({
        location: `${coords.lat},${coords.lng}`,
        radius: radius.toString(),
        keyword: type,
        key: this.apiKey
      });
      
      const response = await fetch(`${this.placesBaseUrl}?${params}`);
      const data = await response.json();
      
      if (data.results) {
        return data.results.map((place: any) => ({
          name: place.name,
          type: place.types?.[0] || type,
          rating: place.rating,
          distance: this.calculateDistance(
            coords.lat, 
            coords.lng, 
            place.geometry.location.lat, 
            place.geometry.location.lng
          ),
          address: place.vicinity
        })).sort((a: PlaceInfo, b: PlaceInfo) => a.distance - b.distance);
      }
      
      return [];
    } catch (error) {
      console.error(`Error searching for ${type}:`, error);
      return [];
    }
  }
  
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
  
  private calculateWalkScore(
    groceries: PlaceInfo[], 
    restaurants: PlaceInfo[], 
    parks: PlaceInfo[], 
    transit: PlaceInfo[]
  ): number {
    // Simple walk score calculation based on nearby amenities
    let score = 50; // Base score
    
    // Add points for nearby amenities (within 800m is walkable)
    const walkableGroceries = groceries.filter(g => g.distance <= 800).length;
    const walkableRestaurants = restaurants.filter(r => r.distance <= 800).length;
    const walkableParks = parks.filter(p => p.distance <= 800).length;
    const walkableTransit = transit.filter(t => t.distance <= 800).length;
    
    score += Math.min(walkableGroceries * 10, 20);
    score += Math.min(walkableRestaurants * 2, 10);
    score += Math.min(walkableParks * 5, 10);
    score += Math.min(walkableTransit * 5, 10);
    
    return Math.min(score, 100);
  }
}

export function createGoogleMapsAPI(): GoogleMapsAPI | null {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not found in environment variables');
    return null;
  }
  
  return new GoogleMapsAPI(apiKey);
}