import { NextRequest, NextResponse } from 'next/server';
import { DealMakerAgent } from '@/lib/services/DealMakerAgent';
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
        // Construct from basic property data (prices are stored in cents)
        propertyData = {
          zpid: existingProperty.id, // Use property ID as zpid
          address: existingProperty.address,
          price: Number(existingProperty.price) / 100, // Convert cents to dollars
          bedrooms: existingProperty.bedrooms,
          bathrooms: existingProperty.bathrooms ? Number(existingProperty.bathrooms) : undefined,
          livingArea: existingProperty.squareFootage, // Use squareFootage instead
          yearBuilt: existingProperty.yearBuilt,
          homeType: existingProperty.propertyType || 'SINGLE_FAMILY',
          homeStatus: 'FOR_SALE', // Default status
          daysOnZillow: 0, // Default value
          zestimate: existingProperty.zestimate ? {
            amount: Number(existingProperty.zestimate) / 100, // Convert cents to dollars
            valuationRange: {
              low: Number(existingProperty.zestimateRangeLow || existingProperty.zestimate) / 100,
              high: Number(existingProperty.zestimateRangeHigh || existingProperty.zestimate) / 100
            }
          } : undefined,
          rentZestimate: existingProperty.rentZestimate ? Number(existingProperty.rentZestimate) / 100 : undefined,
          priceHistory: []
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

    // Initialize Deal Maker Agent
    const dealMaker = new DealMakerAgent();
    
    // Analyze and generate negotiation strategy
    const negotiationAnalysis = await dealMaker.analyzeAndNegotiate(
      propertyData,
      buyerProfile
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
        console.error('Failed to log API usage:', error);
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
    console.error('Deal Maker API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze property negotiation strategy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}