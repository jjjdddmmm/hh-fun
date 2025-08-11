import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = params.id;

    // Get the property to verify ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true }
    });

    if (!property || property.user.clerkId !== userId) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    logger.debug(`🔄 Smart refresh initiated for property: ${propertyId}`);
    
    // Only clear the analysis data - preserve expensive BatchData property fields
    await prisma.propertyAnalysis.deleteMany({
      where: { propertyId: propertyId }
    });
    
    logger.debug(`✅ Deleted old analysis data, BatchData property fields preserved`);
    
    // Check if property has BatchData (to avoid unnecessary API calls)
    const hasBatchData = !!(property.estimatedValue || property.daysOnMarket || property.quickLists);
    
    if (hasBatchData) {
      logger.debug(`💰 Property already has BatchData intelligence - will reuse existing data (saving ~$0.46)`);
    } else {
      logger.debug(`⚠️ Property missing BatchData - fresh analysis will fetch data`);
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