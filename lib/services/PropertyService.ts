import { prisma } from '../prisma';
import { ZillowPropertyData } from '../zillow-api';

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

    return await prisma.property.update({
      where: { id: propertyId },
      data: updateData
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