import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { auth } from "@clerk/nextjs/server";
import { parseMLSUrl } from "@/lib/mls-parser";
import { createBatchDataPropertyAnalysisService, BatchDataPropertyData } from "@/lib/services/BatchDataPropertyAnalysis";
import { createAIAnalysisService } from "@/lib/services/AIAnalysisService";
import { createPropertyService } from "@/lib/services/PropertyService";
import { createEnhancedInvestmentScoringService } from "@/lib/services/EnhancedInvestmentScoring";
import { generalRateLimiter } from "@/lib/rate-limiter";
import { createZillowService } from "@/lib/services/ZillowService";

// Extract address from MLS URL for BatchData search
function extractAddressFromMlsUrl(parsedUrl: any, mlsUrl: string): string {
  logger.debug(`🔍 Extracting address from: ${mlsUrl}`);
  logger.debug(`📋 Parsed URL data:`, parsedUrl);
  
  // Try to extract address from URL patterns
  if (parsedUrl.platform === 'zillow' && mlsUrl.includes('/homedetails/')) {
    const urlParts = mlsUrl.split('/homedetails/')[1]?.split('/')[0];
    if (urlParts) {
      // Convert URL format: "123-Main-St-Los-Angeles-CA-90210" -> "123 Main St Los Angeles CA 90210"
      const address = urlParts.replace(/-/g, ' ').replace(/\d{5}_zpid$/, '').trim();
      logger.debug(`✅ Extracted Zillow address: "${address}"`);
      return address;
    }
  }
  
  // Enhanced pattern matching for various URL formats
  const patterns = [
    /([\d]+-[A-Za-z0-9-]+-[A-Za-z0-9-]+-[A-Za-z-]+-[A-Z]{2}-[\d]{5})/, // Standard format
    /([\d]+[\s-][A-Za-z0-9\s-]+[A-Za-z]{2}[\s-][\d]{5})/, // Alternative format
    /homedetails\/([^/]+)/, // Direct homedetails extraction
  ];
  
  for (const pattern of patterns) {
    const urlMatch = mlsUrl.match(pattern);
    if (urlMatch) {
      const address = urlMatch[1].replace(/-/g, ' ').replace(/\d{5}_zpid$/, '').trim();
      logger.debug(`✅ Pattern matched address: "${address}"`);
      return address;
    }
  }
  
  // Try to use the property data we already have in database
  logger.warn(`⚠️ Could not extract address from URL: ${mlsUrl}`);
  return "Address extraction failed - using property lookup";
}

// Fast basic analysis from BatchData
function createBasicAnalysis(data: BatchDataPropertyData) {
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
      cashFlow: data.rentZestimate ? data.rentZestimate - Math.round(data.price * 0.004) - 500 : 0
    },
    marketAnalysis: {
      pricePerSqftComparison: pricePerSqft > 300 ? 'above market' : 'on par with market',
      marketTrend: data.daysOnMarket && data.daysOnMarket > 60 ? 'cold' : 'warm',
      demandLevel: data.daysOnMarket && data.daysOnMarket < 30 ? 'high' : 'medium',
      appreciation: 'moderate'
    },
    aiConfidence: 90,
    analysis: 'Quick analysis based on BatchData. AI insights loading...',
    keyInsights: ['Analysis loading...'],
    redFlags: [] as string[]
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

    // Initialize services - using BatchData instead of expensive Zillow API
    const propertyService = createPropertyService();
    const batchDataService = createBatchDataPropertyAnalysisService(true); // Use production API
    const aiService = createAIAnalysisService();
    const enhancedScoring = createEnhancedInvestmentScoringService();
    const zillowService = createZillowService();

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

    // Get property data from BatchData API (more comprehensive and cost-effective)
    if (batchDataService && batchDataService.isAvailable()) {
      try {
        // Extract address from parsed URL
        const addressFromUrl = extractAddressFromMlsUrl(parsedUrl, mlsUrl);
        logger.debug(`🔍 BatchData: Analyzing property from URL: ${addressFromUrl}`);
        
        let batchData = null;
        
        // Try BatchData search with extracted address
        if (addressFromUrl !== "Address extraction failed - using property lookup") {
          batchData = await batchDataService.getPropertyAnalysis(addressFromUrl, parsedUrl.zpid);
        }
        
        // If extraction failed or no results, try using existing property data
        if (!batchData && targetProperty.address !== "Analyzing...") {
          logger.debug(`🔄 Retrying with existing address: ${targetProperty.address}`);
          batchData = await batchDataService.getPropertyAnalysis(targetProperty.address, parsedUrl.zpid);
        }
        
        // If still no results, try with just the ZIP code for area search
        if (!batchData && addressFromUrl.includes(' ')) {
          const zipMatch = addressFromUrl.match(/\b\d{5}\b/);
          if (zipMatch) {
            logger.debug(`🔄 Retrying with ZIP code search: ${zipMatch[0]}`);
            batchData = await batchDataService.getPropertyAnalysis(zipMatch[0], parsedUrl.zpid);
          }
        }
        
        if (batchData && batchDataService.validatePropertyData(batchData)) {
          logger.debug(`✅ BatchData: Found property data for ${batchData.address}`);
          
          propertyData = {
            address: batchData.address,
            price: batchData.price,
            sqft: batchData.livingArea,
            bedrooms: batchData.bedrooms,
            bathrooms: batchData.bathrooms,
            yearBuilt: batchData.yearBuilt,
            daysOnMarket: batchData.daysOnMarket || 0,
            pricePerSqft: batchData.pricePerSqft || 0,
            description: batchData.description || "Property details from BatchData",
            images: batchData.photos || []
          };
          
          // If no photos from BatchData and we have a ZPID, try to fetch photos from Zillow
          if ((!propertyData.images || propertyData.images.length === 0 || 
               propertyData.images[0]?.includes('unsplash')) && parsedUrl.zpid && zillowService.isApiAvailable()) {
            try {
              logger.debug(`📸 Fetching photos from Zillow for ZPID: ${parsedUrl.zpid}`);
              const zillowData = await zillowService.getPropertyData(parsedUrl.zpid);
              
              if (zillowData && zillowData.photos && zillowData.photos.length > 0) {
                logger.debug(`✅ Found ${zillowData.photos.length} photos from Zillow`);
                propertyData.images = zillowData.photos;
                
                // Also update the BatchData object to include real photos
                batchData.photos = zillowData.photos;
              }
            } catch (error) {
              logger.error('Failed to fetch photos from Zillow:', error);
              // Continue with placeholder images
            }
          }

          // Create basic analysis from BatchData (fast)
          analysisData = createBasicAnalysis(batchData);
          
          // 🚀 ENHANCED: Use BatchData + AI for comprehensive investment scoring
          logger.debug('🎯 Generating enhanced investment score with BatchData intelligence...');
          
          try {
            const enhancedScore = await enhancedScoring.calculateEnhancedScore({
              data: propertyData
            }, {
              // Pass through BatchData intelligence from property update
              estimatedValue: batchData.zestimate?.amount,
              marketTrend: batchData.daysOnMarket && batchData.daysOnMarket > 60 ? 'cold' : 'warm',
              demandLevel: batchData.daysOnMarket && batchData.daysOnMarket < 30 ? 'high' : 'medium',
              daysOnMarket: batchData.daysOnMarket,
              // QuickLists intelligence
              ownerOccupied: batchData.quickLists?.ownerOccupied,
              absenteeOwner: batchData.quickLists?.absenteeOwner,
              highEquity: batchData.quickLists?.highEquity,
              cashBuyer: batchData.quickLists?.cashBuyer,
              distressedProperty: batchData.quickLists?.distressedProperty,
              freeAndClear: batchData.quickLists?.freeAndClear,
              recentlySold: batchData.quickLists?.recentlySold,
              // Property features
              pool: batchData.features?.pool,
              garageParkingSpaces: batchData.features?.garage ? 2 : 0,
              // Rental analysis (estimated)
              rentToValueRatio: batchData.rentZestimate ? (batchData.rentZestimate * 12) / batchData.price : 0.01,
              capRate: 0.06 // Default estimate
            });
            
            // Replace simple score with enhanced AI-powered score
            analysisData.investmentScore = enhancedScore.totalScore;
            // Add enhanced fields using flexible assignment
            (analysisData as any).investmentGrade = enhancedScore.grade;
            (analysisData as any).investmentRecommendation = enhancedScore.recommendation;
            (analysisData as any).scoreBreakdown = enhancedScore.breakdown;
            analysisData.keyInsights = enhancedScore.aiInsights;
            analysisData.redFlags = enhancedScore.redFlags;
            (analysisData as any).keyOpportunities = enhancedScore.keyOpportunities;
            analysisData.aiConfidence = enhancedScore.confidence;
            
            logger.debug(`✅ Enhanced investment score: ${enhancedScore.totalScore}/${enhancedScore.maxScore} (${enhancedScore.grade})`);
            
          } catch (error) {
            logger.error('❌ Enhanced scoring failed, falling back to basic AI:', error);
            
            // Fallback to basic AI analysis
            const aiInsights = await aiService.generatePropertyInsights(batchData as any);
            
            if (aiService.validateInsights(aiInsights)) {
              analysisData.investmentScore = aiInsights.investmentScore;
              analysisData.keyInsights = aiInsights.keyInsights;
              analysisData.redFlags = aiInsights.redFlags as any;
            }
          }

          // Update property with enhanced BatchData including intelligence fields
          await propertyService.updatePropertyWithZillowData(propertyId, {
            ...batchData,
            // Ensure BatchData-specific fields are passed through
            quickLists: batchData.quickLists || {},
            demographics: batchData.demographics || {},
            marketAnalytics: {
              avgPricePerSqft: batchData.pricePerSqft || 0,
              avgDaysOnMarket: batchData.daysOnMarket || 0,
              inventoryLevel: 'unknown',
              comparableCount: 0
            },
            priceHistory: [],
            // Intelligence fields from BatchData
            intel: {
              lastSoldPrice: batchData.price,
              lastSoldDate: batchData.soldDate
            },
            valuation: {
              estimatedValue: batchData.zestimate?.amount || batchData.price,
              equityPercent: 50, // Default assumption
              equityAmount: (batchData.zestimate?.amount || batchData.price) * 0.5
            },
            building: {
              pool: batchData.features?.pool || false,
              fireplaceCount: 0,
              garageParkingSpaceCount: batchData.features?.garage ? 2 : 0,
              lotSizeSquareFeet: batchData.lotSize || 0,
              centralAir: true,
              condition: 'good'
            },
            owner: {
              name: 'Unknown',
              ownershipLength: 5 // Reasonable default
            },
            rental: {
              estimatedRent: batchData.rentZestimate || Math.round(batchData.price * 0.01),
              rentToValueRatio: batchData.rentZestimate ? (batchData.rentZestimate * 12) / batchData.price : 0.01,
              capRate: 0.05 // Reasonable default cap rate
            },
            marketTrend: batchData.daysOnMarket && batchData.daysOnMarket > 60 ? 'cold' : 'warm',
            demandLevel: batchData.daysOnMarket && batchData.daysOnMarket < 30 ? 'high' : 'medium'
          } as any, batchData.zpid);
        }
      } catch (error) {
        logger.error("Error fetching from BatchData API:", error);
      }
    }

    // Fallback to mock data if BatchData API fails
    if (!propertyData) {
      logger.warn('⚠️ BatchData unavailable, using fallback data. Cost: $0.46 saved per analysis!');
      
      const mockBatchData: BatchDataPropertyData = {
        zpid: "unknown",
        address: "Property data unavailable - BatchData service down",
        city: "Unknown",
        state: "Unknown",
        zipcode: "00000",
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        livingArea: 2000,
        yearBuilt: 2000,
        propertyType: "Single Family",
        daysOnMarket: 30,
        pricePerSqft: 250,
        description: "Unable to fetch property details from MLS URL via BatchData"
      };

      propertyData = {
        address: mockBatchData.address,
        price: mockBatchData.price,
        sqft: mockBatchData.livingArea,
        bedrooms: mockBatchData.bedrooms,
        bathrooms: mockBatchData.bathrooms,
        yearBuilt: mockBatchData.yearBuilt,
        daysOnMarket: mockBatchData.daysOnMarket || 30,
        pricePerSqft: mockBatchData.pricePerSqft || 250,
        description: mockBatchData.description,
        images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=edges']
      };

      // Create basic analysis from fallback data
      analysisData = createBasicAnalysis(mockBatchData);
      
      // Use AI for investment score, insights and red flags
      const aiInsights = await aiService.generatePropertyInsights(mockBatchData as any);
      
      if (aiService.validateInsights(aiInsights)) {
        analysisData.investmentScore = aiInsights.investmentScore;
        analysisData.keyInsights = aiInsights.keyInsights;
        analysisData.redFlags = aiInsights.redFlags;
      }
      
      // Update property with fallback data using PropertyService
      await propertyService.updatePropertyWithZillowData(propertyId, mockBatchData as any, 'unknown');
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
    logger.error("Error analyzing property:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Legacy functions removed - now handled by AI analysis