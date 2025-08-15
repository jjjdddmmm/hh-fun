import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { createPropertyService } from "@/lib/services/PropertyService";
import { generalRateLimiter } from "@/lib/rate-limiter";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
    if (!generalRateLimiter.isAllowed(userId)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const propertyId = params.id;

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

    // Call the property analysis API with the property data
    const analysisResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/property-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({
        propertyId: propertyId,
        mlsUrl: targetProperty.mlsUrl
      })
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.text();
      logger.error('Property analysis failed:', { 
        status: analysisResponse.status,
        error: errorData,
        propertyId: propertyId.slice(-8)
      });
      return NextResponse.json({ 
        error: "Failed to analyze property", 
        details: errorData 
      }, { status: analysisResponse.status });
    }

    const analysisData = await analysisResponse.json();

    if (!analysisData.success) {
      return NextResponse.json({ 
        error: analysisData.error || "Analysis failed" 
      }, { status: 400 });
    }

    // Return the updated property data
    const updatedProperties = await propertyService.getUserProperties(userId);
    const updatedProperty = updatedProperties.find(p => p.id === propertyId);

    if (!updatedProperty) {
      return NextResponse.json({ error: "Failed to retrieve updated property" }, { status: 500 });
    }

    // Map the property data to match frontend interface
    const mappedProperty = {
      id: updatedProperty.id,
      mlsUrl: updatedProperty.mlsUrl,
      address: updatedProperty.address,
      city: updatedProperty.city,
      state: updatedProperty.state,
      zipCode: updatedProperty.zipCode,
      status: updatedProperty.analyses.length > 0 ? 'analyzed' : 'pending',
      data: {
        address: updatedProperty.address,
        price: Number(updatedProperty.price) / 100, // Convert from cents
        sqft: updatedProperty.squareFootage,
        bedrooms: updatedProperty.bedrooms,
        bathrooms: updatedProperty.bathrooms ? Number(updatedProperty.bathrooms) : null,
        yearBuilt: updatedProperty.yearBuilt,
        daysOnMarket: updatedProperty.daysOnMarket || 0,
        pricePerSqft: updatedProperty.squareFootage ? Number(updatedProperty.price) / 100 / updatedProperty.squareFootage : null,
        description: '',
        images: updatedProperty.images ? JSON.parse(updatedProperty.images as string) : []
      },
      analysis: updatedProperty.analyses.length > 0 ? 
        JSON.parse(updatedProperty.analyses[0].analysis as string) : null
    };

    return NextResponse.json({
      success: true,
      property: mappedProperty
    });

  } catch (error) {
    logger.error("Error in property analyze endpoint:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}