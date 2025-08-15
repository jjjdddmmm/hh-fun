import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createBatchDataPropertyAnalysisService } from '@/lib/services/BatchDataPropertyAnalysis';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    logger.info('🔍 Debug: Testing BatchData API for address:', address);

    // Initialize BatchData service in production mode
    const batchDataService = createBatchDataPropertyAnalysisService(true);

    if (!batchDataService) {
      return NextResponse.json({ 
        error: "BatchData service not available",
        details: "Service initialization failed"
      }, { status: 503 });
    }

    // Get property analysis which includes all the debug logging
    const propertyData = await batchDataService.getPropertyAnalysis(address);

    if (!propertyData) {
      return NextResponse.json({ 
        error: "No property data found",
        details: "BatchData API returned no results for this address"
      }, { status: 404 });
    }

    // Return the full property data structure for debugging
    return NextResponse.json({
      success: true,
      address: address,
      extractedData: {
        address: propertyData.address,
        price: propertyData.price,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        livingArea: propertyData.livingArea,
        yearBuilt: propertyData.yearBuilt,
        propertyType: propertyData.propertyType,
        pricePerSqft: propertyData.pricePerSqft
      },
      fullData: propertyData,
      message: "Check server logs for detailed field extraction debug info"
    });

  } catch (error) {
    logger.error('Debug BatchData error:', error);
    return NextResponse.json({ 
      error: "Debug failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}