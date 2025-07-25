import { prisma } from '../prisma';
import { logger } from "@/lib/utils/logger";
import { createBatchDataComparablesService } from './BatchDataComparablesService';

export interface ComparableCacheParams {
  propertyId: string;
  zipCode: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  radius?: number;
  propertyType?: string;
}

export interface CachedComparableResult {
  comparables: any[];
  stats: {
    avgSalePrice: number;
    avgPricePerSqft: number;
    avgDaysOnMarket: number;
    inventoryLevel: string;
  };
  cacheInfo: {
    fromCache: boolean;
    cacheAge: number; // hours
    accessCount: number;
  };
}

export class ComparablesCacheService {
  private batchDataService = createBatchDataComparablesService(true); // Use production
  private readonly CACHE_EXPIRY_DAYS = 30;
  private readonly STALE_THRESHOLD_DAYS = 7; // Refresh if older than 7 days

  /**
   * Get comparable sales with intelligent caching
   */
  async getComparables(params: ComparableCacheParams): Promise<CachedComparableResult | null> {
    try {
      // First, try to find existing cache
      const cached = await this.findCachedComparables(params);
      
      if (cached && this.isCacheValid(cached.expiresAt)) {
        // Update access tracking
        await this.updateCacheAccess(cached.id);
        
        const cacheAge = Math.floor((Date.now() - cached.createdAt.getTime()) / (1000 * 60 * 60));
        
        logger.debug(`🎯 Using cached comparables (${cached.comparableCount} properties, age: ${cacheAge}h)`);
        
        return {
          comparables: (cached.comparablesData as any).comparables || [],
          stats: (cached.comparablesData as any).stats || {
            avgSalePrice: Number(cached.avgSalePrice || 0),
            avgPricePerSqft: Number(cached.avgPricePerSqft || 0),
            avgDaysOnMarket: cached.avgDaysOnMarket || 0,
            inventoryLevel: cached.inventoryLevel || 'unknown'
          },
          cacheInfo: {
            fromCache: true,
            cacheAge,
            accessCount: cached.accessCount
          }
        };
      }

      // Cache miss or expired - fetch from API
      logger.debug('🔍 Cache miss - fetching fresh comparables from BatchData API');
      
      const freshData = await this.fetchFreshComparables(params);
      if (!freshData) {
        return null;
      }

      // Store in cache
      await this.storeCachedComparables(params, freshData);
      
      return {
        ...freshData,
        cacheInfo: {
          fromCache: false,
          cacheAge: 0,
          accessCount: 1
        }
      };

    } catch (error) {
      logger.error('Error in ComparablesCacheService:', error);
      return null;
    }
  }

  /**
   * Find existing cached comparables that match parameters
   */
  private async findCachedComparables(params: ComparableCacheParams) {
    return await prisma.comparableSales.findFirst({
      where: {
        propertyId: params.propertyId,
        zipCode: params.zipCode,
        bedrooms: params.bedrooms || null,
        bathrooms: params.bathrooms || null,
        squareFootage: params.squareFootage || null,
        radius: params.radius || 0.5,
        propertyType: params.propertyType || null,
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      orderBy: {
        lastAccessedAt: 'desc'
      }
    });
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(expiresAt: Date): boolean {
    return new Date() < expiresAt;
  }

  /**
   * Update cache access tracking
   */
  private async updateCacheAccess(cacheId: string) {
    await prisma.comparableSales.update({
      where: { id: cacheId },
      data: {
        lastAccessedAt: new Date(),
        accessCount: {
          increment: 1
        }
      }
    });
  }

  /**
   * Fetch fresh comparables from BatchData API
   */
  private async fetchFreshComparables(params: ComparableCacheParams) {
    if (!this.batchDataService || !this.batchDataService.isAvailable()) {
      logger.warn('BatchData service not available');
      return null;
    }

    const response = await this.batchDataService.getComparables(
      '', // address not needed for zip search
      params.zipCode,
      params.bedrooms,
      params.bathrooms,
      params.squareFootage,
      params.radius || 0.5,
      params.propertyType
    );

    if (!response || !response.comparables) {
      return null;
    }

    // Map BatchData stats to our expected format
    const mappedStats = {
      avgSalePrice: response.stats?.averagePrice || 0,
      avgPricePerSqft: response.stats?.averagePricePerSqft || 0,
      avgDaysOnMarket: 0, // BatchData doesn't provide this in stats, calculate from comparables
      inventoryLevel: response.comparables.length < 3 ? 'low' : response.comparables.length < 6 ? 'medium' : 'high'
    };

    // Calculate average days on market from comparables
    if (response.comparables.length > 0) {
      const totalDaysOnMarket = response.comparables.reduce((sum: number, comp: any) => 
        sum + (comp.daysOnMarket || 0), 0);
      mappedStats.avgDaysOnMarket = Math.round(totalDaysOnMarket / response.comparables.length);
    }

    return {
      comparables: response.comparables,
      stats: mappedStats
    };
  }

  /**
   * Store comparables data in cache
   */
  private async storeCachedComparables(params: ComparableCacheParams, data: any) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.CACHE_EXPIRY_DAYS);

    await prisma.comparableSales.create({
      data: {
        propertyId: params.propertyId,
        zipCode: params.zipCode,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        squareFootage: params.squareFootage,
        radius: params.radius || 0.5,
        propertyType: params.propertyType,
        comparablesData: data,
        comparableCount: data.comparables?.length || 0,
        avgSalePrice: data.stats?.avgSalePrice || 0,
        avgPricePerSqft: data.stats?.avgPricePerSqft || 0,
        avgDaysOnMarket: data.stats?.avgDaysOnMarket || 0,
        inventoryLevel: data.stats?.inventoryLevel || 'unknown',
        expiresAt,
        apiCost: 0.46 // BatchData comparable search cost
      }
    });

    logger.debug(`💾 Cached ${data.comparables?.length || 0} comparables for ${params.zipCode} (expires: ${expiresAt.toLocaleDateString()})`);
  }

  /**
   * Clean up expired cache entries (can be run periodically)
   */
  async cleanupExpiredCache() {
    const result = await prisma.comparableSales.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    logger.debug(`🧹 Cleaned up ${result.count} expired comparable cache entries`);
    return result.count;
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    const stats = await prisma.comparableSales.aggregate({
      _count: {
        id: true
      },
      _sum: {
        apiCost: true,
        accessCount: true
      },
      _avg: {
        accessCount: true
      }
    });

    const totalSaved = await prisma.comparableSales.aggregate({
      _sum: {
        accessCount: true,
        apiCost: true
      }
    });

    return {
      totalCacheEntries: stats._count.id || 0,
      totalApiCostPaid: Number(stats._sum.apiCost || 0),
      totalAccessCount: stats._sum.accessCount || 0,
      avgAccessPerEntry: Number(stats._avg.accessCount || 0),
      estimatedSavings: (totalSaved._sum.accessCount || 0) * Number(totalSaved._sum.apiCost || 0) * 0.9 // 90% savings estimate
    };
  }

  /**
   * Force refresh cache for a specific property
   */
  async refreshCache(params: ComparableCacheParams) {
    // Delete existing cache
    await prisma.comparableSales.deleteMany({
      where: {
        propertyId: params.propertyId,
        zipCode: params.zipCode
      }
    });

    // Fetch fresh data
    return await this.getComparables(params);
  }
}

export function createComparablesCacheService(): ComparablesCacheService {
  return new ComparablesCacheService();
}