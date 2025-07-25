import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    // Get the property to verify ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true }
    });

    if (!property || property.user.clerkId !== userId) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    // Clear existing analysis data
    const deletedAnalyses = await prisma.propertyAnalysis.deleteMany({
      where: { propertyId: propertyId }
    });
    

    // Reset property to analyzing state
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        address: "Analyzing...",
        city: "Unknown",
        state: "CA",
        zipCode: "00000",
        price: BigInt(50000000),
        squareFootage: 2000,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2000,
        propertyType: "Unknown"
      }
    });


    return NextResponse.json({
      success: true,
      message: "Property refresh initiated"
    });

  } catch (error) {
    logger.error("❌ Error refreshing property:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}