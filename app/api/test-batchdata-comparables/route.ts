import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";
import { createBatchDataComparablesService } from '@/lib/services/BatchDataComparablesService';

export async function GET(_request: NextRequest) {
  try {
    logger.debug('🧪 Testing BatchData Comparables Service...');
    
    const batchDataAPI = createBatchDataComparablesService();
    
    if (!batchDataAPI) {
      return NextResponse.json({
        success: false,
        error: 'BatchData API not available'
      });
    }

    logger.debug('✅ BatchData service created successfully');

    // Test with simple address and zip code from Beverly Hills
    const testAddress = '1545 N Vista St';
    const testZipCode = '90210';
    
    logger.debug(`🔍 Testing search for: ${testAddress}, ${testZipCode}`);

    // Capture console logs
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: any[]) => {
      logs.push(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
      originalLog(...args);
    };

    try {
      const result = await batchDataAPI.getComparables(
        testAddress,
        testZipCode,
        4, // bedrooms
        3, // bathrooms  
        2550, // squareFootage
        0.5, // radius
        'SINGLE_FAMILY' // propertyType
      );

      return NextResponse.json({
        success: true,
        testAddress,
        testZipCode,
        result,
        logs,
        message: 'BatchData Comparables test completed'
      });

    } finally {
      console.log = originalLog;
    }

  } catch (error) {
    logger.error('BatchData Comparables test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}