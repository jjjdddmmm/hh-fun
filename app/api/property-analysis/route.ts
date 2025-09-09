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
  
  // Use real Zestimate if available, otherwise BatchData valuation, otherwise list price
  const bestEstimate = data.zestimate?.amount || data.batchDataValuation?.amount || data.price;
  const isOverpriced = bestEstimate ? 
    ((data.price - bestEstimate) / bestEstimate) > 0.05 : false;
  
  return {
    marketValue: {
      low: data.zestimate?.valuationRange?.low || data.batchDataValuation?.valuationRange?.low || data.price * 0.95,
      high: data.zestimate?.valuationRange?.high || data.batchDataValuation?.valuationRange?.high || data.price * 1.05,
      estimated: bestEstimate,
      confidence: data.zestimate ? 90 : (data.batchDataValuation ? 80 : 70)
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

    // Smart BatchData Usage: Check if property already has BatchData to avoid unnecessary API calls
    const hasExistingBatchData = !!(targetProperty.estimatedValue || targetProperty.daysOnMarket || targetProperty.quickLists);
    
    if (hasExistingBatchData) {
      logger.debug(`💰 Reusing existing BatchData for property ${targetProperty.id.slice(-8)} (saving ~$0.46)`);
      
      // Convert existing property data to the expected format (BigInt cents to dollars)
      const priceInDollars = Number(targetProperty.price) / 100; // Convert from cents to dollars
      
      // Create complete address for AI context (street + city + state)
      const fullAddress = [
        targetProperty.address,
        targetProperty.city,
        targetProperty.state
      ].filter(Boolean).join(' ') || 'Unknown';
      
      propertyData = {
        address: fullAddress,
        price: priceInDollars,
        sqft: targetProperty.squareFootage || 2000,
        bedrooms: targetProperty.bedrooms || 3,
        bathrooms: Number(targetProperty.bathrooms) || 2,
        yearBuilt: targetProperty.yearBuilt || 2000,
        daysOnMarket: targetProperty.daysOnMarket || 0,
        pricePerSqft: Math.round(priceInDollars / (targetProperty.squareFootage || 2000)),
        description: `Property details for ${targetProperty.address}`,
        images: targetProperty.images ? JSON.parse(targetProperty.images as string) : []
      };
      
      // Create mock batchData structure from existing property for enhanced scoring
      const mockBatchDataFromProperty = {
        zpid: 'existing-property',
        address: fullAddress,
        city: targetProperty.city || 'Unknown',
        state: targetProperty.state || 'Unknown',
        zipcode: targetProperty.zipCode || '00000',
        price: priceInDollars, // Use converted price in dollars
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        livingArea: propertyData.sqft,
        yearBuilt: propertyData.yearBuilt,
        propertyType: targetProperty.propertyType || 'Single Family',
        daysOnMarket: propertyData.daysOnMarket,
        pricePerSqft: propertyData.pricePerSqft,
        quickLists: targetProperty.quickLists ? JSON.parse(targetProperty.quickLists as string) : {},
        batchDataValuation: targetProperty.estimatedValue ? {
          amount: Number(targetProperty.estimatedValue) / 100, // Convert from cents to dollars
          valuationRange: {
            low: Number(targetProperty.estimatedValue) / 100 * 0.95,
            high: Number(targetProperty.estimatedValue) / 100 * 1.05
          }
        } : undefined
      };
      
      // Create analysis using existing data
      analysisData = createBasicAnalysis(mockBatchDataFromProperty);
      
      // Run enhanced scoring with existing BatchData
      try {
        logger.debug('🎯 Running enhanced scoring with existing BatchData...');
        const enhancedScore = await enhancedScoring.calculateEnhancedScore({
          data: propertyData
        }, {
          estimatedValue: mockBatchDataFromProperty.batchDataValuation?.amount,
          marketTrend: propertyData.daysOnMarket > 60 ? 'cold' : 'warm',
          demandLevel: propertyData.daysOnMarket < 30 ? 'high' : 'medium',
          daysOnMarket: propertyData.daysOnMarket,
          // Use existing quickLists data
          ownerOccupied: mockBatchDataFromProperty.quickLists?.ownerOccupied,
          absenteeOwner: mockBatchDataFromProperty.quickLists?.absenteeOwner,
          highEquity: mockBatchDataFromProperty.quickLists?.highEquity,
          cashBuyer: mockBatchDataFromProperty.quickLists?.cashBuyer,
          distressedProperty: mockBatchDataFromProperty.quickLists?.distressedProperty,
          freeAndClear: mockBatchDataFromProperty.quickLists?.freeAndClear,
          recentlySold: mockBatchDataFromProperty.quickLists?.recentlySold
        });
        
        // Apply enhanced scoring results
        analysisData.investmentScore = enhancedScore.totalScore;
        (analysisData as any).investmentGrade = enhancedScore.grade;
        (analysisData as any).investmentRecommendation = enhancedScore.recommendation;
        (analysisData as any).scoreBreakdown = enhancedScore.breakdown;
        analysisData.keyInsights = enhancedScore.aiInsights;
        analysisData.redFlags = enhancedScore.redFlags;
        (analysisData as any).keyOpportunities = enhancedScore.keyOpportunities;
        analysisData.aiConfidence = enhancedScore.confidence;
        
        logger.debug(`✅ Enhanced scoring with existing data: ${enhancedScore.totalScore}/100 (${enhancedScore.grade})`);
        
      } catch (error) {
        logger.error('❌ Enhanced scoring failed with existing data:', error);
        // Continue with basic analysis
      }
      
    } else {
      logger.debug(`🔄 No existing BatchData found, fetching fresh data from API...`);
      
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
              
              if (zillowData) {
                // Extract photos if available
                if (zillowData.photos && zillowData.photos.length > 0) {
                  logger.debug(`✅ Found ${zillowData.photos.length} photos from Zillow`);
                  propertyData.images = zillowData.photos;
                  batchData.photos = zillowData.photos;
                }
                
                // Extract real Zestimate if available
                if (zillowData.zestimate) {
                  logger.debug(`💰 Found real Zestimate from Zillow: $${zillowData.zestimate.amount.toLocaleString()}`);
                  batchData.zestimate = zillowData.zestimate;
                } else {
                  logger.debug(`⚠️ No Zestimate available from Zillow API`);
                }
                
                // Extract days on Zillow if available
                if (zillowData.daysOnZillow !== undefined) {
                  logger.debug(`📅 Found days on Zillow: ${zillowData.daysOnZillow} days`);
                  batchData.daysOnMarket = zillowData.daysOnZillow;
                  propertyData.daysOnMarket = zillowData.daysOnZillow;
                }
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
          logger.debug('🔍 PropertyData for enhanced scoring:', {
            hasData: !!propertyData,
            hasAddress: !!propertyData?.address,
            hasPrice: !!propertyData?.price,
            hasSqft: !!propertyData?.sqft
          });
          logger.debug('🔍 BatchData intelligence:', {
            hasEstimatedValue: !!batchData.batchDataValuation?.amount,
            daysOnMarket: batchData.daysOnMarket,
            hasQuickLists: !!batchData.quickLists
          });
          
          try {
            const enhancedScore = await enhancedScoring.calculateEnhancedScore({
              data: propertyData
            }, {
              // Pass through BatchData intelligence from property update
              estimatedValue: batchData.batchDataValuation?.amount,
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
            logger.debug('📊 Analysis data structure for frontend:', {
              hasInvestmentScore: !!analysisData.investmentScore,
              hasInvestmentGrade: !!(analysisData as any).investmentGrade,
              hasScoreBreakdown: !!(analysisData as any).scoreBreakdown,
              hasKeyOpportunities: !!(analysisData as any).keyOpportunities,
              investmentScore: analysisData.investmentScore,
              investmentGrade: (analysisData as any).investmentGrade
            });
            
          } catch (error) {
            logger.error('❌ Enhanced scoring failed, falling back to basic AI:', error);
            
            try {
              // Fallback to basic AI analysis
              const aiInsights = await aiService.generatePropertyInsights(batchData as any);
              
              if (aiService.validateInsights(aiInsights)) {
                analysisData.investmentScore = aiInsights.investmentScore;
                analysisData.keyInsights = aiInsights.keyInsights;
                analysisData.redFlags = aiInsights.redFlags as any;
              }
            } catch (aiError) {
              logger.error('❌ AI analysis also failed, providing basic fallback:', aiError);
              
              // Provide basic fallback scoring when both enhanced scoring and AI fail
              analysisData.investmentScore = 65; // Neutral score
              (analysisData as any).investmentGrade = 'C+';
              (analysisData as any).investmentRecommendation = 'HOLD';
              (analysisData as any).scoreBreakdown = {
                dealPotential: { score: 15, maxScore: 25, description: 'Analysis pending - manual review needed', factors: ['Review property fundamentals'] },
                marketTiming: { score: 12, maxScore: 20, description: 'Standard market conditions', factors: ['Market analysis in progress'] },
                ownerMotivation: { score: 10, maxScore: 20, description: 'Owner motivation unknown', factors: ['Research seller situation'] },
                financialOpportunity: { score: 12, maxScore: 20, description: 'Financial analysis needed', factors: ['Calculate rental yields'] },
                riskAssessment: { score: 10, maxScore: 15, description: 'Risk assessment pending', factors: ['Property inspection recommended'] }
              };
              analysisData.keyInsights = ['Property analysis completed with BatchData intelligence', 'AI insights temporarily unavailable - enhanced scoring active'];
              analysisData.redFlags = ['Complete manual analysis recommended'];
              (analysisData as any).keyOpportunities = ['Review property details for investment potential'];
              analysisData.aiConfidence = 70;
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
            // Separate BatchData valuation from Zillow Zestimate (convert to cents for BigInt storage)
            estimatedValue: (() => {
              const val = batchData.batchDataValuation?.amount ? BigInt(Math.round(batchData.batchDataValuation.amount * 100)) : null;
              logger.debug('💰 EstimatedValue for DB:', { 
                batchDataVal: batchData.batchDataValuation?.amount, 
                dbValue: val?.toString() 
              });
              return val;
            })(),
            zestimate: (() => {
              const val = batchData.zestimate?.amount ? BigInt(Math.round(batchData.zestimate.amount * 100)) : null;
              logger.debug('🟡 Zestimate for DB:', { 
                zestimateVal: batchData.zestimate?.amount, 
                dbValue: val?.toString() 
              });
              return val;
            })(),
            zestimateRangeLow: batchData.zestimate?.valuationRange?.low ? BigInt(Math.round(batchData.zestimate.valuationRange.low * 100)) : null,
            zestimateRangeHigh: batchData.zestimate?.valuationRange?.high ? BigInt(Math.round(batchData.zestimate.valuationRange.high * 100)) : null,
            zestimateLastUpdated: batchData.zestimate ? new Date() : null,
            valuation: {
              estimatedValue: batchData.batchDataValuation?.amount || batchData.price,
              equityPercent: 50, // Default assumption
              equityAmount: (batchData.batchDataValuation?.amount || batchData.price) * 0.5
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

    // Final check before sending to frontend
    logger.debug('🎯 Final analysis data being sent to frontend:', {
      hasInvestmentScore: !!analysisData!.investmentScore,
      hasInvestmentGrade: !!(analysisData! as any).investmentGrade,
      hasScoreBreakdown: !!(analysisData! as any).scoreBreakdown,
      investmentScore: analysisData!.investmentScore,
      investmentGrade: (analysisData! as any).investmentGrade,
      scoreBreakdownKeys: (analysisData! as any).scoreBreakdown ? Object.keys((analysisData! as any).scoreBreakdown) : 'none'
    });

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