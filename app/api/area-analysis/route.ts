import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createGoogleMapsAPI } from "@/lib/google-maps-api";

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

    // Initialize Google Maps API
    const googleMapsAPI = createGoogleMapsAPI();
    if (!googleMapsAPI) {
      return NextResponse.json({ 
        error: "Area analysis service unavailable", 
        message: "Google Maps API key not configured" 
      }, { status: 503 });
    }

    // Fetch area analysis
    const areaData = await googleMapsAPI.getAreaAnalysis(
      property.address,
      property.zipCode
    );

    if (!areaData) {
      return NextResponse.json({ 
        error: "Could not analyze area", 
        message: "Unable to fetch area data for this location" 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: areaData
    });

  } catch (error) {
    logger.error("Error fetching area analysis:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}