import { NextRequest, NextResponse } from 'next/server';
import { BatchDataService } from '@/lib/services/BatchDataService';

export async function GET(request: NextRequest) {
  try {
    const batchData = new BatchDataService();
    
    if (!batchData.isAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'BatchData API not available'
      });
    }

    // Test with a few different zip codes to find good sandbox data
    const testZipCodes = ['90210', '90046', '10001', '77001', '85001', '33101'];
    const results = [];

    for (const zipCode of testZipCodes) {
      console.log(`🔍 Testing zip code: ${zipCode}`);
      
      const result = await batchData.makeRequest('/api/v1/property/search', {
        searchCriteria: {
          query: zipCode
        },
        options: {
          take: 1 // Just one property per zip to analyze
        }
      }, 'POST');

      if (result.success && result.data) {
        const responseData = result.data as any;
        const properties = responseData.results?.properties || responseData.properties || [];
        if (properties.length > 0) {
          const property = properties[0];
        
          results.push({
            zipCode,
            propertyFound: true,
            address: property.address,
            availableFields: Object.keys(property).sort(),
            priceFields: {
              'mls.price': property.mls?.price,
              'mls.soldPrice': property.mls?.soldPrice,
              'mls.listPrice': property.mls?.listPrice,
              'sale.lastSalePrice': property.sale?.lastSalePrice,
              'valuation.estimatedValue': property.valuation?.estimatedValue,
              'deedHistory[0].salePrice': property.deedHistory?.[0]?.salePrice,
              'price': property.price,
              'listPrice': property.listPrice,
              'salePrice': property.salePrice,
              'soldPrice': property.soldPrice,
              'marketValue': property.marketValue,
              'assessedValue': property.assessedValue
            },
            propertyDetails: {
              'mls.bedroomCount': property.mls?.bedroomCount,
              'building.bedroomCount': property.building?.bedroomCount,
              'bedrooms': property.bedrooms,
              'mls.bathroomCount': property.mls?.bathroomCount,
              'building.bathroomCount': property.building?.bathroomCount,
              'bathrooms': property.bathrooms,
              'mls.livingArea': property.mls?.livingArea,
              'building.totalBuildingAreaSquareFeet': property.building?.totalBuildingAreaSquareFeet,
              'squareFootage': property.squareFootage,
              'livingArea': property.livingArea
            },
            saleInfo: {
              'mls.soldDate': property.mls?.soldDate,
              'sale.lastSaleDate': property.sale?.lastSaleDate,
              'deedHistory[0].saleDate': property.deedHistory?.[0]?.saleDate,
              'mls.status': property.mls?.status,
              'mls.statusCategory': property.mls?.statusCategory
            }
          });
          
          // Only analyze first good property in detail
          if (results.length === 1) {
            console.log(`📊 Full property structure for ${zipCode}:`);
            console.log(JSON.stringify(property, null, 2));
          }
        }
      } else {
        results.push({
          zipCode,
          propertyFound: false,
          error: result.error || 'No properties found'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'BatchData field analysis completed',
      results,
      recommendations: [
        'Check which zip codes have good data coverage',
        'Identify correct fields for price, bedrooms, bathrooms',
        'Determine if sale prices vs listing prices are available',
        'Fix field mapping in BatchDataComparablesService'
      ]
    });

  } catch (error) {
    console.error('BatchData field analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}