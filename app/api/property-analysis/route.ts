import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseMLSUrl } from "@/lib/mls-parser";
import { createZillowService } from "@/lib/services/ZillowService";
import { createAIAnalysisService } from "@/lib/services/AIAnalysisService";
import { createPropertyService } from "@/lib/services/PropertyService";
import { ZillowPropertyData } from "@/lib/zillow-api";
import { generalRateLimiter } from "@/lib/rate-limiter";

// Fast basic analysis from API data
function createBasicAnalysis(data: ZillowPropertyData) {
  const pricePerSqft = data.pricePerSqft || Math.round(data.price / data.livingArea);
  const isOverpriced = data.zestimate ? 
    ((data.price - data.zestimate.amount) / data.zestimate.amount) > 0.05 : false;
  
  return {
    marketValue: {
      low: data.zestimate?.valuationRange.low || data.price * 0.95,
      high: data.zestimate?.valuationRange.high || data.price * 1.05,
      estimated: data.zestimate?.amount || data.price,
      confidence: 85
    },
    recommendation: isOverpriced ? 'overpriced' : 'good',
    investmentScore: 0, // Will be replaced by AI
    negotiationStrategy: {
      suggestedOffer: data.price * 0.97,
      tactics: ['Market analysis', 'Inspection contingency'],
      leverage: ['Zestimate comparison', 'Days on market']
    },
    financialProjection: {
      monthlyMortgage: Math.round(data.price * 0.004),
      downPayment: Math.round(data.price * 0.2),
      closingCosts: Math.round(data.price * 0.03),
      monthlyExpenses: 500,
      cashFlow: 0
    },
    marketAnalysis: {
      pricePerSqftComparison: pricePerSqft > 300 ? 'above market' : 'on par with market',
      marketTrend: data.daysOnZillow && data.daysOnZillow > 60 ? 'cold' : 'warm',
      demandLevel: data.daysOnZillow && data.daysOnZillow < 30 ? 'high' : 'medium',
      appreciation: 'moderate'
    },
    aiConfidence: 90,
    analysis: 'Quick analysis based on Zillow data. AI insights loading...',
    keyInsights: ['Analysis loading...'],
    redFlags: []
  };
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

    const { propertyId, mlsUrl } = await request.json();

    if (!propertyId || !mlsUrl) {
      return NextResponse.json({ error: "Property ID and MLS URL are required" }, { status: 400 });
    }

    // Initialize services
    const propertyService = createPropertyService();
    const zillowService = createZillowService();
    const aiService = createAIAnalysisService();

    // Verify property ownership
    const property = await propertyService.getUserProperties(userId);
    const targetProperty = property.find(p => p.id === propertyId);
    
    if (!targetProperty) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    // Parse MLS URL to extract property identifier
    const parsedUrl = parseMLSUrl(mlsUrl);

    let propertyData = null;
    let analysisData = null;

    // Try to get real property data from Zillow API
    if (parsedUrl.platform === 'zillow' && parsedUrl.zpid) {
      if (zillowService.isApiAvailable()) {
        try {
          const zillowData = await zillowService.getPropertyData(parsedUrl.zpid);
          
          if (zillowData && zillowService.validatePropertyData(zillowData)) {
            propertyData = {
              address: zillowData.address,
              price: zillowData.price,
              sqft: zillowData.livingArea,
              bedrooms: zillowData.bedrooms,
              bathrooms: zillowData.bathrooms,
              yearBuilt: zillowData.yearBuilt,
              daysOnMarket: zillowData.daysOnZillow || 0,
              pricePerSqft: zillowData.pricePerSqft || (zillowData.price / zillowData.livingArea),
              description: zillowData.description || "Property details",
              images: zillowData.photos || []
            };

            // Create basic analysis from API data (fast)
            analysisData = createBasicAnalysis(zillowData);
            
            // Use AI for investment score, insights and red flags
            const aiInsights = await aiService.generatePropertyInsights(zillowData);
            
            if (aiService.validateInsights(aiInsights)) {
              analysisData.investmentScore = aiInsights.investmentScore;
              analysisData.keyInsights = aiInsights.keyInsights;
              analysisData.redFlags = aiInsights.redFlags;
            }

            // Update property with real data
            await propertyService.updatePropertyWithZillowData(propertyId, zillowData, parsedUrl.zpid);
          }
        } catch (error) {
          console.error("Error fetching from Zillow API:", error);
        }
      }
    }

    // Fallback to mock data if API fails
    if (!propertyData) {
      const mockZillowData = {
        zpid: "unknown",
        address: "Property data unavailable",
        city: "Unknown",
        state: "Unknown",
        zipcode: "00000",
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        livingArea: 2000,
        yearBuilt: 2000,
        propertyType: "Single Family",
        daysOnZillow: 30,
        pricePerSqft: 250,
        description: "Unable to fetch property details from MLS URL"
      };

      propertyData = {
        address: mockZillowData.address,
        price: mockZillowData.price,
        sqft: mockZillowData.livingArea,
        bedrooms: mockZillowData.bedrooms,
        bathrooms: mockZillowData.bathrooms,
        yearBuilt: mockZillowData.yearBuilt,
        daysOnMarket: mockZillowData.daysOnZillow,
        pricePerSqft: mockZillowData.pricePerSqft,
        description: mockZillowData.description,
        images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges']
      };

      // Create basic analysis from fallback data
      analysisData = createBasicAnalysis(mockZillowData as any);
      
      // Use AI for investment score, insights and red flags
      const aiInsights = await aiService.generatePropertyInsights(mockZillowData as any);
      
      if (aiService.validateInsights(aiInsights)) {
        analysisData.investmentScore = aiInsights.investmentScore;
        analysisData.keyInsights = aiInsights.keyInsights;
        analysisData.redFlags = aiInsights.redFlags;
      }
      
      // Update property with fallback data using PropertyService
      await propertyService.updatePropertyWithZillowData(propertyId, mockZillowData as any, 'unknown');
    }

    // Save analysis to database
    if (analysisData) {
      await propertyService.saveAnalysis(propertyId, analysisData);
    }

    return NextResponse.json({
      success: true,
      data: {
        property: propertyData,
        analysis: analysisData!
      }
    });
  } catch (error) {
    console.error("Error analyzing property:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Legacy functions removed - now handled by AI analysis