import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";
import { createComparablesCacheService } from '@/lib/services/ComparablesCacheService';

export async function GET() {
  try {
    const cacheService = createComparablesCacheService();
    
    // Get cache statistics
    const stats = await cacheService.getCacheStats();
    
    // Calculate potential savings
    const potentialApiCost = stats.totalAccessCount * 0.46; // $0.46 per API call
    const actualCost = stats.totalApiCostPaid;
    const totalSavings = potentialApiCost - actualCost;
    const savingsPercentage = potentialApiCost > 0 ? ((totalSavings / potentialApiCost) * 100) : 0;

    return NextResponse.json({
      success: true,
      cache: {
        totalEntries: stats.totalCacheEntries,
        totalAccessCount: stats.totalAccessCount,
        avgAccessPerEntry: Math.round(stats.avgAccessPerEntry * 100) / 100,
        
        // Cost Analysis
        actualApiCost: Math.round(actualCost * 100) / 100,
        potentialApiCost: Math.round(potentialApiCost * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        savingsPercentage: Math.round(savingsPercentage * 100) / 100,
        
        // Performance Metrics
        cacheHitRatio: stats.totalAccessCount > 0 ? 
          Math.round(((stats.totalAccessCount - stats.totalCacheEntries) / stats.totalAccessCount) * 100) : 0,
        
        // Recommendations
        recommendations: [
          stats.avgAccessPerEntry < 2 ? 'Consider increasing cache expiry to improve efficiency' : null,
          savingsPercentage < 50 ? 'Cache is saving less than 50% - consider optimization' : null,
          stats.totalCacheEntries > 1000 ? 'Consider implementing cache cleanup strategy' : null
        ].filter(Boolean)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching comparables cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache statistics' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cacheService = createComparablesCacheService();
    
    // Clean up expired cache entries
    const cleanupCount = await cacheService.cleanupExpiredCache();
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanupCount} expired cache entries`,
      cleanupCount
    });
    
  } catch (error) {
    logger.error('Error cleaning up cache:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup cache' },
      { status: 500 }
    );
  }
}