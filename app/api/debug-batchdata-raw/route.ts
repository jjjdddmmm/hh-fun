import { NextRequest, NextResponse } from 'next/server';
import { BatchDataService } from '@/lib/services/BatchDataService';
import { logger } from '@/lib/utils/logger';

// Debug endpoint - GET request for easier testing
export async function GET(request: NextRequest) {
  try {
    // Get address from query params or use default
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address') || '2431 Greenvalley Rd';

    logger.info('🔍 Debug: Raw BatchData API test for:', { address });

    // Initialize BatchData service
    const batchDataService = new BatchDataService(true); // Use production API

    if (!batchDataService.isAvailable()) {
      return NextResponse.json({ 
        error: "BatchData service not available",
        details: "API key not configured"
      }, { status: 503 });
    }

    // Make direct API call to search for property
    const searchResult = await batchDataService.makeRequest(
      '/api/v1/property/search',
      {
        searchCriteria: { query: address },
        options: { take: 1, includeAll: true }
      },
      'POST'
    );

    if (!searchResult.success || !searchResult.data) {
      return NextResponse.json({ 
        error: "No results from BatchData",
        searchResult
      }, { status: 404 });
    }

    // Extract properties from response
    const properties = searchResult.data?.results?.properties || 
                      searchResult.data?.properties || 
                      searchResult.data?.data?.properties || 
                      [];

    if (properties.length === 0) {
      return NextResponse.json({ 
        error: "No properties found",
        rawResponse: searchResult.data
      }, { status: 404 });
    }

    const property = properties[0];

    // Log the full structure for debugging
    logger.info('🏠 FULL PROPERTY STRUCTURE:', JSON.stringify(property, null, 2));

    // Check all sections for property details
    const allSections = {
      listing: property.listing,
      sale: property.sale,
      valuation: property.valuation,
      demographics: property.demographics,
      assessment: property.assessment,
      tax: property.tax,
      building: property.building,
      mls: property.mls,
      intel: property.intel,
      propertyDetails: property.propertyDetails,
      details: property.details
    };

    // Log what sections exist
    logger.info('Available sections:', Object.entries(allSections)
      .filter(([_, value]) => value !== undefined)
      .map(([key, _]) => key));

    // Extract all possible field locations
    const fieldLocations = {
      // Square footage fields
      sqftFields: {
        'building.totalBuildingAreaSquareFeet': property.building?.totalBuildingAreaSquareFeet,
        'building.squareFeet': property.building?.squareFeet,
        'building.livingArea': property.building?.livingArea,
        'building.size': property.building?.size,
        'mls.totalBuildingAreaSquareFeet': property.mls?.totalBuildingAreaSquareFeet,
        'mls.squareFeet': property.mls?.squareFeet,
        'mls.livingArea': property.mls?.livingArea,
        'mls.size': property.mls?.size,
        'listing.squareFootage': property.listing?.squareFootage,
        'listing.livingArea': property.listing?.livingArea,
        'listing.size': property.listing?.size,
        'sale.squareFootage': property.sale?.squareFootage,
        'assessment.squareFootage': property.assessment?.squareFootage,
        'assessment.totalSquareFootage': property.assessment?.totalSquareFootage,
        'squareFootage': property.squareFootage,
        'livingArea': property.livingArea,
        'size': property.size,
        'intel.squareFootage': property.intel?.squareFootage,
      },
      // Bedroom fields
      bedroomFields: {
        'building.bedroomCount': property.building?.bedroomCount,
        'building.bedrooms': property.building?.bedrooms,
        'mls.bedroomCount': property.mls?.bedroomCount,
        'mls.bedrooms': property.mls?.bedrooms,
        'listing.bedrooms': property.listing?.bedrooms,
        'listing.bedroomCount': property.listing?.bedroomCount,
        'sale.bedrooms': property.sale?.bedrooms,
        'assessment.bedrooms': property.assessment?.bedrooms,
        'bedrooms': property.bedrooms,
        'bedroomCount': property.bedroomCount,
        'intel.bedrooms': property.intel?.bedrooms,
      },
      // Bathroom fields
      bathroomFields: {
        'building.bathroomCount': property.building?.bathroomCount,
        'building.bathrooms': property.building?.bathrooms,
        'building.fullBathrooms': property.building?.fullBathrooms,
        'mls.bathroomCount': property.mls?.bathroomCount,
        'mls.bathrooms': property.mls?.bathrooms,
        'mls.fullBathrooms': property.mls?.fullBathrooms,
        'listing.bathrooms': property.listing?.bathrooms,
        'listing.bathroomCount': property.listing?.bathroomCount,
        'listing.fullBathrooms': property.listing?.fullBathrooms,
        'sale.bathrooms': property.sale?.bathrooms,
        'assessment.bathrooms': property.assessment?.bathrooms,
        'bathrooms': property.bathrooms,
        'bathroomCount': property.bathroomCount,
        'intel.bathrooms': property.intel?.bathrooms,
      }
    };

    // Find which fields have actual values
    const foundFields = {
      sqft: Object.entries(fieldLocations.sqftFields)
        .filter(([_, value]) => value !== undefined && value !== null)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      bedrooms: Object.entries(fieldLocations.bedroomFields)
        .filter(([_, value]) => value !== undefined && value !== null)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      bathrooms: Object.entries(fieldLocations.bathroomFields)
        .filter(([_, value]) => value !== undefined && value !== null)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
    };

    return NextResponse.json({
      success: true,
      address: address,
      message: "Check server console for full property structure",
      foundFields,
      topLevelKeys: Object.keys(property),
      buildingKeys: property.building ? Object.keys(property.building) : [],
      mlsKeys: property.mls ? Object.keys(property.mls) : [],
      intelKeys: property.intel ? Object.keys(property.intel) : [],
      listingKeys: property.listing ? Object.keys(property.listing) : [],
      saleKeys: property.sale ? Object.keys(property.sale) : [],
      valuationKeys: property.valuation ? Object.keys(property.valuation) : [],
      sections: {
        hasBuilding: !!property.building,
        hasMLS: !!property.mls,
        hasListing: !!property.listing,
        hasSale: !!property.sale,
        hasValuation: !!property.valuation,
        hasAssessment: !!property.assessment
      },
      // Show actual content of key sections
      listing: property.listing || null,
      sale: property.sale || null,
      valuation: property.valuation || null,
      rawPropertySample: JSON.stringify(property, null, 2).substring(0, 1000)
    });

  } catch (error) {
    logger.error('Debug BatchData error:', error);
    return NextResponse.json({ 
      error: "Debug failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}