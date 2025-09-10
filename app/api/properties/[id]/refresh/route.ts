import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = params.id;
    
    // Check if this is a force refresh (clears BatchData fields too)
    let forceRefresh = false;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const body = await request.json();
        forceRefresh = body.forceRefresh === true;
      }
    } catch (e) {
      // If JSON parsing fails, default to false
      logger.debug('JSON parsing failed, defaulting to smart refresh');
    }

    // Get the property to verify ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true }
    });

    if (!property || property.user.clerkId !== userId) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    logger.debug(`🔄 ${forceRefresh ? 'Force' : 'Smart'} refresh initiated for property: ${propertyId}`);
    
    // Clear the analysis data
    await prisma.propertyAnalysis.deleteMany({
      where: { propertyId: propertyId }
    });
    
    if (forceRefresh) {
      // Force refresh: Clear BatchData fields to trigger fresh API calls
      await prisma.property.update({
        where: { id: propertyId },
        data: {
          // Clear core BatchData fields to force re-fetch
          estimatedValue: null,
          daysOnMarket: null,
          quickLists: Prisma.JsonNull,
          estimatedRent: null,
          lastSalePrice: null,
          lastSaleDate: null,
          equityAmount: null,
          equityPercent: null,
          mortgageBalance: null,
          marketTrend: null,
          demandLevel: null,
          pricePerSqft: null,
          ownerName: null,
          ownerOccupied: null,
          absenteeOwner: null,
          ownershipLength: null,
          highEquity: null,
          cashBuyer: null,
          distressedProperty: null,
          foreclosureStatus: null,
          fixAndFlipPotential: null,
          rentToValueRatio: null,
          capRate: null,
          buildingFeatures: Prisma.JsonNull,
          neighborhoodData: Prisma.JsonNull,
          priceHistory: Prisma.JsonNull,
          marketAnalytics: Prisma.JsonNull,
          batchDataLastUpdated: null,
          // Also clear property details that might have wrong data
          yearBuilt: null,
          squareFootage: null,
          bedrooms: null,
          bathrooms: null
        }
      });
      logger.debug(`🔥 Force refresh: Cleared BatchData fields - will fetch fresh data from API`);
    } else {
      // Smart refresh: preserve expensive BatchData property fields
      logger.debug(`✅ Smart refresh: Deleted old analysis data, BatchData property fields preserved`);
      
      // Check if property has BatchData (to avoid unnecessary API calls)
      const hasBatchData = !!(property.estimatedValue || property.daysOnMarket || property.quickLists);
      
      if (hasBatchData) {
        logger.debug(`💰 Property already has BatchData intelligence - will reuse existing data (saving ~$0.46)`);
      } else {
        logger.debug(`⚠️ Property missing BatchData - fresh analysis will fetch data`);
      }
    }


    return NextResponse.json({
      success: true,
      message: "Property refresh initiated"
    });

  } catch (error) {
    logger.error("❌ Error refreshing property:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}