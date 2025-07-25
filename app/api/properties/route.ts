import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { createPropertyService } from "@/lib/services/PropertyService";
import { generalRateLimiter } from "@/lib/rate-limiter";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
    if (!generalRateLimiter.isAllowed(userId)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const propertyService = createPropertyService();
    const properties = await propertyService.getUserProperties(userId);

    const mappedProperties = properties.map(property => {
      let analysis = null;
      let parsedImages = [];
      
      // Try to parse analysis data
      if (property.analyses.length > 0) {
        try {
          const rawAnalysis = property.analyses[0].analysis;
          analysis = JSON.parse(rawAnalysis as string);
        } catch (error) {
          logger.error('❌ Failed to parse analysis for property:', property.id, error);
          logger.error('❌ Raw analysis that failed:', property.analyses[0].analysis);
        }
      } else {
      }
      
      // Try to parse images
      if (property.images) {
        try {
          parsedImages = JSON.parse(property.images as string);
        } catch (error) {
          logger.error('❌ Failed to parse images for property:', property.id, error);
        }
      }
      
      const mappedProperty = {
        id: property.id,
        mlsUrl: property.mlsUrl,
        // Add database fields to match frontend interface
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        status: property.analyses.length > 0 ? 'analyzed' : 'pending',
        data: {
          address: property.address,
          price: Number(property.price) / 100, // Convert from cents
          sqft: property.squareFootage,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms ? Number(property.bathrooms) : null,
          yearBuilt: property.yearBuilt,
          daysOnMarket: property.daysOnMarket || 0,
          pricePerSqft: property.squareFootage ? Number(property.price) / 100 / property.squareFootage : null,
          description: '', // Add description field
          images: parsedImages
        },
        analysis: analysis
      };
      
      
      return mappedProperty;
    });

    return NextResponse.json({
      success: true,
      properties: mappedProperties
    });
  } catch (error) {
    logger.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const { mlsUrl, clerkId } = await request.json();

    if (!mlsUrl) {
      return NextResponse.json({ error: "MLS URL is required" }, { status: 400 });
    }

    const propertyService = createPropertyService();
    
    const result = await propertyService.createProperty({
      userId,
      mlsUrl,
      clerkId
    });

    if ('isExisting' in result && result.isExisting) {
      return NextResponse.json({
        success: true,
        property: {
          id: result.property.id,
          mlsUrl: result.property.mlsUrl
        },
        message: "Property already exists in your portfolio"
      });
    }
    
    if ('isRestored' in result && result.isRestored) {
      return NextResponse.json({
        success: true,
        property: {
          id: result.property.id,
          mlsUrl: result.property.mlsUrl
        },
        message: "Property restored to your portfolio"
      });
    }

    return NextResponse.json({
      success: true,
      property: {
        id: result.property.id,
        mlsUrl: result.property.mlsUrl
      }
    });
  } catch (error) {
    logger.error("Error creating property:", error);
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 });
  }
}