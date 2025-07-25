import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";
import { DealMakerAgent } from '@/lib/services/DealMakerAgent';
import { createComparablesCacheService } from '@/lib/services/ComparablesCacheService';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    const body = await request.json();
    const { 
      propertyUrl,
      propertyId,
      buyerProfile 
    } = body;

    if (!propertyUrl && !propertyId) {
      return NextResponse.json(
        { error: 'Property URL or ID is required' },
        { status: 400 }
      );
    }

    if (!buyerProfile?.maxBudget || !buyerProfile?.downPaymentAvailable) {
      return NextResponse.json(
        { error: 'Buyer profile with maxBudget and downPaymentAvailable is required' },
        { status: 400 }
      );
    }

    // Get property data
    let propertyData;
    
    if (propertyId) {
      // Try to get from database first
      const existingProperty = await prisma.property.findUnique({
        where: { id: propertyId }
      });
      
      if (existingProperty) {
        // Construct comprehensive property data including ALL BatchData intelligence (prices are stored in cents)
        propertyData = {
          zpid: existingProperty.id,
          address: existingProperty.address,
          price: Number(existingProperty.price) / 100,
          bedrooms: existingProperty.bedrooms,
          bathrooms: existingProperty.bathrooms ? Number(existingProperty.bathrooms) : undefined,
          livingArea: existingProperty.squareFootage,
          sqft: existingProperty.squareFootage, // Alternative field name
          yearBuilt: existingProperty.yearBuilt,
          homeType: existingProperty.propertyType || 'SINGLE_FAMILY',
          homeStatus: 'FOR_SALE',
          
          // === ENHANCED BATCHDATA INTELLIGENCE FIELDS ===
          // Market & Timing Intelligence
          daysOnMarket: existingProperty.daysOnMarket || 0,
          daysOnZillow: existingProperty.daysOnMarket || 0, // Legacy compatibility
          marketTrend: existingProperty.marketTrend,
          demandLevel: existingProperty.demandLevel,
          pricePerSqft: existingProperty.pricePerSqft,
          
          // Financial Intelligence
          estimatedValue: existingProperty.estimatedValue ? Number(existingProperty.estimatedValue) / 100 : undefined,
          lastSalePrice: existingProperty.lastSalePrice ? Number(existingProperty.lastSalePrice) / 100 : undefined,
          lastSaleDate: existingProperty.lastSaleDate,
          equityAmount: existingProperty.equityAmount ? Number(existingProperty.equityAmount) / 100 : undefined,
          equityPercent: existingProperty.equityPercent ? Number(existingProperty.equityPercent) : undefined,
          mortgageBalance: existingProperty.mortgageBalance ? Number(existingProperty.mortgageBalance) / 100 : undefined,
          
          // Owner Intelligence (Critical for Negotiation!)
          ownerName: existingProperty.ownerName,
          ownerOccupied: existingProperty.ownerOccupied,
          absenteeOwner: existingProperty.absenteeOwner,
          ownershipLength: existingProperty.ownershipLength,
          ownerPhone: existingProperty.ownerPhone,
          ownerEmail: existingProperty.ownerEmail,
          
          // Investment Signals
          highEquity: existingProperty.highEquity,
          cashBuyer: existingProperty.cashBuyer,
          distressedProperty: existingProperty.distressedProperty,
          foreclosureStatus: existingProperty.foreclosureStatus,
          fixAndFlipPotential: existingProperty.fixAndFlipPotential,
          
          // Property Features
          pool: existingProperty.buildingFeatures ? JSON.parse(existingProperty.buildingFeatures as string)?.pool : false,
          garageParkingSpaces: existingProperty.buildingFeatures ? JSON.parse(existingProperty.buildingFeatures as string)?.garageParkingSpaces : 0,
          fireplaceCount: existingProperty.buildingFeatures ? JSON.parse(existingProperty.buildingFeatures as string)?.fireplaceCount : 0,
          
          // QuickLists Intelligence (Parsed from JSON)
          corporateOwned: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.corporateOwned : undefined,
          trustOwned: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.trustOwned : undefined,
          freeAndClear: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.freeAndClear : undefined,
          vacant: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.vacant : undefined,
          taxDefault: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.taxDefault : undefined,
          listedBelowMarketPrice: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.listedBelowMarketPrice : undefined,
          failedListing: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.expiredListing : undefined,
          expiredListing: existingProperty.quickLists ? JSON.parse(existingProperty.quickLists as string)?.expiredListing : undefined,
          
          // Rental Analysis
          rentZestimate: existingProperty.rentZestimate ? Number(existingProperty.rentZestimate) / 100 : undefined,
          estimatedRent: existingProperty.estimatedRent ? Number(existingProperty.estimatedRent) / 100 : undefined,
          rentToValueRatio: existingProperty.rentToValueRatio ? Number(existingProperty.rentToValueRatio) : undefined,
          capRate: existingProperty.capRate ? Number(existingProperty.capRate) : undefined,
          
          // Valuation Data
          zestimate: existingProperty.zestimate ? {
            amount: Number(existingProperty.zestimate) / 100,
            valuationRange: {
              low: Number(existingProperty.zestimateRangeLow || existingProperty.zestimate) / 100,
              high: Number(existingProperty.zestimateRangeHigh || existingProperty.zestimate) / 100
            }
          } : undefined,
          
          // Historical Data
          priceHistory: existingProperty.priceHistory ? JSON.parse(existingProperty.priceHistory as string) : [],
          
          // Data Quality Indicators
          batchDataLastUpdated: existingProperty.batchDataLastUpdated,
          batchDataCost: existingProperty.batchDataCost
        };
      } else {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }
    }
    
    if (!propertyData && propertyUrl) {
      // For now, return error if property not found
      // TODO: Add Zillow fetch functionality back
      return NextResponse.json(
        { error: 'Property not found. Please add it from the Analysis page first.' },
        { status: 404 }
      );
      
      /* Zillow fetch disabled for now */
    }

    // Initialize services
    const dealMaker = new DealMakerAgent();
    const comparablesCache = createComparablesCacheService();
    
    // Get comparable sales data with intelligent caching
    let marketData = {};
    if (propertyData) {
      try {
        logger.debug('🔍 Fetching comparable sales for enhanced offer strategy (with caching)...');
        const zipCode = (propertyData.address.match(/\b\d{5}\b/)?.[0]) || '90210';
        
        const cachedComparables = await comparablesCache.getComparables({
          propertyId: propertyData.zpid,
          zipCode,
          bedrooms: propertyData.bedrooms || undefined,
          bathrooms: propertyData.bathrooms || undefined,
          squareFootage: propertyData.livingArea || propertyData.sqft || undefined,
          radius: 0.5,
          propertyType: 'SINGLE_FAMILY'
        });
        
        if (cachedComparables && cachedComparables.comparables.length > 0) {
          marketData = {
            recentComps: cachedComparables.comparables,
            avgSalePrice: cachedComparables.stats.avgSalePrice,
            avgPricePerSqft: cachedComparables.stats.avgPricePerSqft,
            avgDaysOnMarket: cachedComparables.stats.avgDaysOnMarket,
            inventoryLevel: cachedComparables.stats.inventoryLevel
          };
          
          const cacheInfo = cachedComparables.cacheInfo;
          logger.debug(`✅ Found ${cachedComparables.comparables.length} comparable sales ${cacheInfo.fromCache ? `(cached, age: ${cacheInfo.cacheAge}h, accessed: ${cacheInfo.accessCount}x)` : '(fresh from API)'}`);
        }
      } catch (error) {
        logger.error('❌ Failed to fetch comparables for offer strategy:', error);
      }
    }
    
    // Analyze and generate iron-clad negotiation strategy with ALL intelligence
    const negotiationAnalysis = await dealMaker.analyzeAndNegotiate(
      propertyData,
      buyerProfile,
      marketData
    );

    // Log the request for analytics
    // TODO: Add API usage tracking when model is created
    /*
    if (userId) {
      try {
        await prisma.apiUsage.create({
          data: {
            userId,
            endpoint: '/api/deal-maker',
            method: 'POST',
            statusCode: 200,
            metadata: {
              propertyId: propertyData.zpid?.toString() || propertyId,
              listPrice: propertyData.price,
              recommendedOffer: negotiationAnalysis.recommendedOffer.amount
            }
          }
        });
      } catch (error) {
        logger.error('Failed to log API usage:', error);
      }
    }
    */

    return NextResponse.json({
      success: true,
      propertyData: {
        address: propertyData!.address,
        listPrice: propertyData!.price,
        daysOnMarket: propertyData!.daysOnZillow,
        yearBuilt: propertyData!.yearBuilt,
        sqft: propertyData!.livingArea,
        bedrooms: propertyData!.bedrooms,
        bathrooms: propertyData!.bathrooms
      },
      negotiationAnalysis,
      message: "Let's get you that home you didn't know you could afford!"
    });

  } catch (error) {
    logger.error('Deal Maker API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze property negotiation strategy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}