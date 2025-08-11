import { prisma } from '../prisma';
import { logger } from "@/lib/utils/logger";
import { ZillowPropertyData } from '../zillow-api';
// import { BatchDataPropertyData } from './BatchDataPropertyAnalysis'; // Currently unused

export interface CreatePropertyInput {
  userId: string;
  mlsUrl: string;
  clerkId: string;
}

export interface UpdatePropertyInput {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  askingPrice?: number;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  propertyType?: string;
  lotSize?: number;
  propertyTaxes?: number;
  hoaFees?: number;
  zestimate?: number;
  zestimateRangeLow?: number;
  zestimateRangeHigh?: number;
  rentZestimate?: number;
  mlsNumber?: string;
  images?: string[];
}

export class PropertyService {
  async createProperty(input: CreatePropertyInput) {
    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: input.userId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: input.userId,
          email: '',
        }
      });
    }

    // Check if property already exists (including soft-deleted ones)
    const existingProperty = await prisma.property.findFirst({
      where: { 
        userId: user.id,
        mlsUrl: input.mlsUrl
      },
      include: { analyses: true }
    });

    if (existingProperty) {
      if (existingProperty.deletedAt) {
        // Restore soft-deleted property
        return await this.restoreProperty(existingProperty.id);
      } else {
        // Property already exists and is active
        return {
          property: existingProperty,
          isExisting: true
        };
      }
    }

    // Create new property
    const property = await prisma.property.create({
      data: {
        userId: user.id,
        mlsUrl: input.mlsUrl,
        address: "Analyzing...",
        city: "Unknown",
        state: "CA",
        zipCode: "00000",
        price: BigInt(50000000), // $500k placeholder
        squareFootage: 2000,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2000,
        propertyType: "Unknown"
      }
    });

    return {
      property,
      isExisting: false
    };
  }

  async updatePropertyWithZillowData(propertyId: string, zillowData: ZillowPropertyData, mlsNumber: string) {
    const updateData: any = {
      address: zillowData.address,
      city: zillowData.city,
      state: zillowData.state,
      zipCode: zillowData.zipcode,
      price: BigInt(zillowData.price * 100),
      askingPrice: BigInt(zillowData.price * 100),
      squareFootage: zillowData.livingArea,
      bedrooms: zillowData.bedrooms,
      bathrooms: zillowData.bathrooms,
      yearBuilt: zillowData.yearBuilt,
      propertyType: zillowData.propertyType,
      lotSize: zillowData.lotSize,
      propertyTaxes: zillowData.propertyTaxes ? BigInt(Math.round(zillowData.propertyTaxes * 100)) : null,
      hoaFees: zillowData.hoaFee ? BigInt(Math.round(zillowData.hoaFee * 100)) : null,
      mlsNumber: mlsNumber,
      images: JSON.stringify(zillowData.photos || [])
    };

    // Add Zestimate data if available
    if (zillowData.zestimate?.amount) {
      updateData.zestimate = BigInt(Math.round(zillowData.zestimate.amount * 100));
      updateData.zestimateRangeLow = BigInt(Math.round(zillowData.zestimate.valuationRange.low * 100));
      updateData.zestimateRangeHigh = BigInt(Math.round(zillowData.zestimate.valuationRange.high * 100));
      updateData.zestimateLastUpdated = new Date();
    }

    if (zillowData.rentZestimate) {
      updateData.rentZestimate = BigInt(Math.round(zillowData.rentZestimate * 100));
    }

    // === ADD BATCHDATA INTELLIGENCE FIELDS ===
    this.addBatchDataFields(updateData, zillowData);

    return await prisma.property.update({
      where: { id: propertyId },
      data: updateData
    });
  }

  /**
   * Extract and populate BatchData intelligence fields
   */
  private addBatchDataFields(updateData: any, data: any) {
    logger.debug('📈 Adding BatchData intelligence fields...');
    logger.debug('📊 Available data fields:', Object.keys(data));
    // Financial Intelligence Fields
    if (data.quickLists?.lastSoldPrice || data.intel?.lastSoldPrice) {
      updateData.lastSalePrice = BigInt(Math.round((data.quickLists?.lastSoldPrice || data.intel?.lastSoldPrice) * 100));
    }
    if (data.quickLists?.lastSoldDate || data.intel?.lastSoldDate) {
      updateData.lastSaleDate = new Date(data.quickLists?.lastSoldDate || data.intel?.lastSoldDate);
    }
    // Handle BatchData valuation vs Zillow Zestimate separately
    if (data.estimatedValue && !updateData.estimatedValue) {
      updateData.estimatedValue = data.estimatedValue; // Already converted in route
    }
    if (data.zestimate && !updateData.zestimate) {
      updateData.zestimate = data.zestimate; // Already converted in route
    }
    if (data.zestimateRangeLow && !updateData.zestimateRangeLow) {
      updateData.zestimateRangeLow = data.zestimateRangeLow; // Already converted in route
    }
    if (data.zestimateRangeHigh && !updateData.zestimateRangeHigh) {
      updateData.zestimateRangeHigh = data.zestimateRangeHigh; // Already converted in route
    }
    if (data.zestimateLastUpdated && !updateData.zestimateLastUpdated) {
      updateData.zestimateLastUpdated = data.zestimateLastUpdated; // Already set in route
    }
    if (data.valuation?.equityAmount) {
      updateData.equityAmount = BigInt(Math.round(data.valuation.equityAmount * 100));
    }
    if (data.valuation?.equityPercent) {
      updateData.equityPercent = data.valuation.equityPercent;
    }
    if (data.openLien?.totalOpenLienBalance) {
      updateData.mortgageBalance = BigInt(Math.round(data.openLien.totalOpenLienBalance * 100));
    }

    // Market & Timing Intelligence
    if (data.daysOnMarket) {
      updateData.daysOnMarket = data.daysOnMarket;
    }
    if (data.marketTrend) {
      updateData.marketTrend = data.marketTrend;
    }
    if (data.demandLevel) {
      updateData.demandLevel = data.demandLevel;
    }
    if (data.pricePerSqft || (data.price && data.livingArea)) {
      updateData.pricePerSqft = data.pricePerSqft || Math.round(data.price / data.livingArea);
    }

    // Owner Intelligence (Critical for Lead Generation)
    if (data.owner?.name) {
      updateData.ownerName = data.owner.name;
    }
    if (data.quickLists?.ownerOccupied !== undefined) {
      updateData.ownerOccupied = data.quickLists.ownerOccupied;
    }
    if (data.quickLists?.absenteeOwner !== undefined) {
      updateData.absenteeOwner = data.quickLists.absenteeOwner;
    }
    if (data.owner?.ownershipLength) {
      updateData.ownershipLength = data.owner.ownershipLength;
    }
    if (data.owner?.phone) {
      updateData.ownerPhone = data.owner.phone;
    }
    if (data.owner?.email) {
      updateData.ownerEmail = data.owner.email;
    }

    // Investment Signals
    if (data.quickLists?.highEquity !== undefined) {
      updateData.highEquity = data.quickLists.highEquity;
    }
    if (data.quickLists?.cashBuyer !== undefined) {
      updateData.cashBuyer = data.quickLists.cashBuyer;
    }
    if (data.quickLists?.distressedProperty !== undefined) {
      updateData.distressedProperty = data.quickLists.distressedProperty;
    }
    if (data.foreclosure?.status) {
      updateData.foreclosureStatus = data.foreclosure.status;
    }
    if (data.quickLists?.fixAndFlip !== undefined) {
      updateData.fixAndFlipPotential = data.quickLists.fixAndFlip;
    }

    // Rental Analysis
    if (data.rentZestimate) {
      updateData.estimatedRent = BigInt(Math.round(data.rentZestimate * 100));
    }
    if (data.rental?.rentToValueRatio) {
      updateData.rentToValueRatio = data.rental.rentToValueRatio;
    }
    if (data.rental?.capRate) {
      updateData.capRate = data.rental.capRate;
    }

    // JSON Fields (Rich Data)
    if (data.quickLists && Object.keys(data.quickLists).length > 0) {
      updateData.quickLists = JSON.stringify(data.quickLists);
    }
    if (data.features || data.building) {
      const features = {
        pool: data.building?.pool || data.features?.pool || false,
        fireplaceCount: data.building?.fireplaceCount || 0,
        garageParkingSpaces: data.building?.garageParkingSpaceCount || 0,
        centralAir: data.building?.centralAir || false,
        condition: data.building?.condition || 'unknown',
        lotSizeSquareFeet: data.building?.lotSizeSquareFeet || data.lotSize || 0
      };
      updateData.buildingFeatures = JSON.stringify(features);
    }
    if (data.demographics) {
      updateData.neighborhoodData = JSON.stringify(data.demographics);
    }
    if (data.priceHistory) {
      updateData.priceHistory = JSON.stringify(data.priceHistory);
    }
    if (data.marketAnalytics) {
      updateData.marketAnalytics = JSON.stringify(data.marketAnalytics);
    }

    // Data Freshness Tracking
    updateData.batchDataLastUpdated = new Date();
    updateData.batchDataCost = 0.46; // Standard BatchData property lookup cost

    logger.debug(`📊 Enhanced BatchData fields populated for property update`);
    logger.debug('🔍 Updated fields preview:', {
      hasFinancialData: !!(updateData.lastSalePrice || updateData.estimatedValue),
      hasOwnerData: !!(updateData.ownerName || updateData.ownerOccupied !== undefined),
      hasInvestmentSignals: !!(updateData.highEquity !== undefined || updateData.cashBuyer !== undefined),
      hasMarketData: !!(updateData.marketTrend || updateData.daysOnMarket),
      hasJsonFields: !!(updateData.quickLists || updateData.buildingFeatures)
    });
  }

  async restoreProperty(propertyId: string) {
    // Clear any old analysis data
    await prisma.propertyAnalysis.deleteMany({
      where: { propertyId: propertyId }
    });

    // Reset property to analyzing state
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        deletedAt: null,
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

    return {
      property,
      isRestored: true
    };
  }

  async getUserProperties(userId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return await prisma.property.findMany({
      where: { 
        userId: user.id,
        deletedAt: null
      },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteProperty(propertyId: string, userId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true }
    });

    if (!property || property.user.clerkId !== userId) {
      throw new Error('Property not found or unauthorized');
    }

    return await prisma.property.update({
      where: { id: propertyId },
      data: { deletedAt: new Date() }
    });
  }

  async saveAnalysis(propertyId: string, analysis: any) {
    return await prisma.propertyAnalysis.create({
      data: {
        propertyId,
        analysisType: "comprehensive",
        aiModel: "claude-3-5-sonnet-20241022",
        analysis: JSON.stringify(analysis),
        confidence: analysis?.aiConfidence ? analysis.aiConfidence / 100 : 0.5
      }
    });
  }
}

export function createPropertyService(): PropertyService {
  return new PropertyService();
}