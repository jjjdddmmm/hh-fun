import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createRentcastAPI } from "@/lib/rentcast-api";
import { createBatchDataComparablesService } from "@/lib/services/BatchDataComparablesService";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
    }

    // Get property details from database
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true }
    });

    if (!property || property.user.clerkId !== userId) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    // Initialize BatchData API with RentCast fallback
    const batchDataAPI = createBatchDataComparablesService();
    const rentcastAPI = createRentcastAPI();
    
    if (!batchDataAPI && !rentcastAPI) {
      return NextResponse.json({ error: "Comparables service unavailable" }, { status: 503 });
    }

    // Parse the address to extract street address and zip code
    const fullAddress = property.address;
    let streetAddress = fullAddress;
    let zipCode = property.zipCode;
    
    // Extract zip code from full address if not in separate field
    const zipMatch = fullAddress.match(/(\d{5}(?:-\d{4})?)$/);
    if (zipMatch && !zipCode) {
      zipCode = zipMatch[1];
      streetAddress = fullAddress.replace(/, [A-Z]{2} \d{5}(?:-\d{4})?$/, '').trim();
    }
    
    logger.debug(`🔍 Searching comparables for: ${streetAddress}, ${zipCode}`);

    // SAFE IMPLEMENTATION: Keep RentCast as primary, test BatchData in parallel
    let compsData = null;
    let batchDataResults = null;
    
    // BatchData testing with sandbox (cost-controlled)
    if (batchDataAPI) {
      logger.debug('🧪 Testing BatchData API with sandbox (safe for development)...');
      batchDataAPI.getComparables(
        streetAddress,
        zipCode,
        property.bedrooms || undefined,
        property.bathrooms ? Number(property.bathrooms) : undefined,
        property.squareFootage || undefined,
        0.5,
        property.propertyType || undefined
      ).then(result => {
        logger.debug('📊 BatchData sandbox test result:', result ? `${result.comparables.length} comparables` : 'failed');
        if (result && result.comparables.length > 0) {
          logger.debug('✅ Sample BatchData comparable:', result.comparables[0]);
        }
      }).catch(error => {
        logger.debug('⚠️ BatchData sandbox test error:', error.message);
      });
    }

    // Primary flow: Use RentCast (unchanged)
    if (!rentcastAPI) {
      return NextResponse.json({ error: "Comparables service unavailable" }, { status: 503 });
    }

    compsData = await rentcastAPI.getComparables(
      streetAddress,
      zipCode,
      property.bedrooms || undefined,
      property.bathrooms ? Number(property.bathrooms) : undefined,
      property.squareFootage || undefined,
      0.5, // Start with 0.5 mile radius
      property.propertyType || undefined
    );

    if (!compsData || compsData.comparables.length === 0) {
      // Try with larger radius but same property type
      const expandedComps = await rentcastAPI.getComparables(
        streetAddress,
        zipCode,
        property.bedrooms || undefined,
        property.bathrooms ? Number(property.bathrooms) : undefined,
        property.squareFootage || undefined,
        1.0, // 1 mile radius
        property.propertyType || undefined
      );
      
      if (expandedComps && expandedComps.comparables.length > 0) {
        return NextResponse.json({
          success: true,
          data: expandedComps,
          searchRadius: 1.0,
          dataSource: 'RentCast'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: compsData || { comparables: [], stats: {} },
      searchRadius: 0.5,
      dataSource: 'RentCast'
    });

  } catch (error) {
    logger.error("Error fetching comparables:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}