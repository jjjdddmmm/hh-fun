import { NextResponse } from 'next/server';
import { BatchDataPropertyAnalysisService } from '@/lib/services/BatchDataPropertyAnalysis';
import { logger } from '@/lib/utils/logger';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    logger.debug(`🔍 DEBUG: Auditing BatchData Zestimate for ${address}`);
    
    const batchDataService = new BatchDataPropertyAnalysisService(true); // Use production
    const result = await batchDataService.getPropertyAnalysis(address);
    
    if (!result) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    
    // Return audit information
    const audit = {
      address: result.address,
      price: result.price,
      zestimate: result.zestimate,
      // Check if we have separate valuation fields
      hasValuation: !!result.zestimate,
      estimatedValue: result.zestimate?.amount,
      valuationSource: 'BatchData AVM (incorrectly mapped to zestimate)',
      issue: 'BatchData valuation is being used as Zestimate - they should be separate',
      correctApproach: 'Keep BatchData valuation separate, fetch real Zestimate from Zillow API',
      rawZestimateData: result.zestimate
    };
    
    logger.debug('🔍 Zestimate Audit Results:', audit);
    
    return NextResponse.json(audit);
    
  } catch (error) {
    logger.error('Debug BatchData Zestimate error:', error);
    return NextResponse.json(
      { error: 'Failed to audit Zestimate data' }, 
      { status: 500 }
    );
  }
}