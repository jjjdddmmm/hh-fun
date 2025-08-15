import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { timelineService } from "@/lib/services/TimelineService";
import { generalRateLimiter } from "@/lib/rate-limiter";
import { createPropertyService } from "@/lib/services/PropertyService";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
    if (!generalRateLimiter.isAllowed(userId)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { propertyId, propertyData } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
    }

    const propertyService = createPropertyService();
    
    // Verify property ownership
    const properties = await propertyService.getUserProperties(userId);
    const targetProperty = properties.find(p => p.id === propertyId);
    
    if (!targetProperty) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    // Check if timeline already exists
    const existingTimeline = await timelineService.getTimelineByPropertyId(userId, propertyId);
    
    if (existingTimeline) {
      return NextResponse.json({
        success: true,
        timeline: existingTimeline,
        message: "Timeline already exists for this property"
      });
    }

    // Create timeline with property data
    const timeline = await timelineService.createTimeline(userId, {
      propertyId: propertyId,
      title: `${targetProperty.address} Purchase Timeline`,
      estimatedClosingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      customSteps: [] // Use default timeline steps
    });

    return NextResponse.json({
      success: true,
      timeline: timeline,
      message: "Timeline created successfully"
    });

  } catch (error) {
    logger.error("Error creating timeline:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}