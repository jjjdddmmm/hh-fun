import { BatchDataService } from './BatchDataService';
import { logger } from "@/lib/utils/logger";
import { BatchDataProperty, BatchDataComparable, BatchDataMarketAnalysis } from '@/types/batchdata';

export interface PropertyEnrichmentData {
  // Enhanced property information
  property: {
    id: string;
    address: string;
    estimatedValue?: number;
    lastSalePrice?: number;
    lastSaleDate?: string;
    daysOnMarket?: number;
    ownershipLength?: number;
    ownerOccupied?: boolean;
    priceHistory?: Array<{
      date: string;
      price: number;
      event: string;
    }>;
    neighborhood?: string;
    walkScore?: number;
  };

  // Market intelligence
  marketAnalysis: {
    medianPrice?: number;
    averagePrice?: number;
    pricePerSquareFoot?: number;
    averageDaysOnMarket?: number;
    marketTrend?: 'hot' | 'warm' | 'balanced' | 'cool' | 'cold';
    inventoryLevel?: number;
    priceChangePercent?: number;
    competitiveness?: number; // 1-100 scale
  };

  // Comparable properties
  comparables: Array<{
    address: string;
    salePrice: number;
    saleDate: string;
    distance: number;
    similarity: number;
    adjustedPrice?: number;
    daysOnMarket?: number;
  }>;

  // Seller insights
  sellerIntelligence: {
    motivationLevel: 'high' | 'medium' | 'low';
    motivationIndicators: string[];
    negotiationLeverage: string[];
    timeOnMarket: string;
    priceReductions?: Array<{
      date: string;
      oldPrice: number;
      newPrice: number;
      reduction: number;
    }>;
  };

  // Investment analysis
  investmentInsights: {
    rentEstimate?: number;
    capRate?: number;
    cashFlowPotential?: number;
    appreciationPotential?: number;
    riskFactors: string[];
    opportunities: string[];
  };

  // Confidence and metadata
  dataConfidence: number; // 0-100
  lastUpdated: string;
  dataSources: string[];
}

export class DataEnrichmentService {
  private batchData: BatchDataService;

  constructor() {
    this.batchData = new BatchDataService();
  }

  async enrichPropertyData(
    address: string,
    existingPropertyData?: any
  ): Promise<PropertyEnrichmentData | null> {
    if (!this.batchData.isAvailable()) {
      logger.warn('BatchData service not available - using fallback enrichment');
      return this.createFallbackEnrichment(address, existingPropertyData);
    }

    try {
      logger.debug(`🔍 Enriching property data for: ${address}`);

      // Get comprehensive data from BatchData
      const enhancedData = await this.batchData.getEnhancedPropertyData(address);

      if (!enhancedData.property) {
        logger.warn('No BatchData property found - using fallback');
        return this.createFallbackEnrichment(address, existingPropertyData);
      }

      // Transform BatchData response to our enrichment format
      const enrichment: PropertyEnrichmentData = {
        property: {
          id: enhancedData.property.id || address,
          address: enhancedData.property.address || address,
          estimatedValue: enhancedData.property.estimatedValue,
          lastSalePrice: enhancedData.property.lastSalePrice,
          lastSaleDate: enhancedData.property.lastSaleDate,
          daysOnMarket: enhancedData.property.daysOnMarket,
          ownershipLength: enhancedData.property.ownershipLength,
          ownerOccupied: enhancedData.property.ownerOccupied,
          priceHistory: enhancedData.property.priceHistory?.map(ph => ({
            date: ph.date,
            price: ph.price,
            event: ph.event
          })),
          neighborhood: enhancedData.property.neighborhood,
          walkScore: enhancedData.neighborhood?.walkScore
        },

        marketAnalysis: {
          medianPrice: enhancedData.marketAnalysis?.medianPrice,
          averagePrice: enhancedData.marketAnalysis?.averagePrice,
          pricePerSquareFoot: enhancedData.marketAnalysis?.pricePerSquareFoot,
          averageDaysOnMarket: enhancedData.marketAnalysis?.daysOnMarket,
          marketTrend: enhancedData.marketAnalysis?.marketTrend,
          inventoryLevel: enhancedData.marketAnalysis?.inventoryLevel,
          priceChangePercent: enhancedData.marketAnalysis?.priceChangePercent,
          competitiveness: this.calculateMarketCompetitiveness(enhancedData.marketAnalysis || undefined)
        },

        comparables: enhancedData.comparables.map(comp => ({
          address: comp.property.address,
          salePrice: comp.property.lastSalePrice || 0,
          saleDate: comp.property.lastSaleDate || '',
          distance: comp.distance,
          similarity: comp.similarity,
          adjustedPrice: comp.adjustedPrice,
          daysOnMarket: comp.property.daysOnMarket
        })),

        sellerIntelligence: this.analyzeSellerMotivation(
          enhancedData.property,
          enhancedData.marketAnalysis || undefined
        ),

        investmentInsights: this.generateInvestmentInsights(
          enhancedData.property,
          enhancedData.marketAnalysis || undefined,
          enhancedData.comparables
        ),

        dataConfidence: enhancedData.confidence,
        lastUpdated: new Date().toISOString(),
        dataSources: ['BatchData', 'PropertyAnalysis']
      };

      logger.debug(`✅ Property enrichment completed with ${enhancedData.confidence}% confidence`);
      return enrichment;

    } catch (error) {
      logger.error('BatchData enrichment failed:', error);
      return this.createFallbackEnrichment(address, existingPropertyData);
    }
  }

  private calculateMarketCompetitiveness(marketAnalysis?: BatchDataMarketAnalysis): number {
    if (!marketAnalysis) return 50;

    let competitiveness = 50;

    // Factor in market trend
    switch (marketAnalysis.marketTrend) {
      case 'hot': competitiveness += 30; break;
      case 'warm': competitiveness += 15; break;
      case 'balanced': competitiveness += 0; break;
      case 'cool': competitiveness -= 15; break;
      case 'cold': competitiveness -= 30; break;
    }

    // Factor in inventory level (lower inventory = more competitive)
    if (marketAnalysis.inventoryLevel) {
      if (marketAnalysis.inventoryLevel < 3) competitiveness += 20;
      else if (marketAnalysis.inventoryLevel < 6) competitiveness += 0;
      else competitiveness -= 20;
    }

    // Factor in days on market (faster sales = more competitive)
    if (marketAnalysis.daysOnMarket) {
      if (marketAnalysis.daysOnMarket < 15) competitiveness += 15;
      else if (marketAnalysis.daysOnMarket < 30) competitiveness += 5;
      else if (marketAnalysis.daysOnMarket > 60) competitiveness -= 15;
    }

    return Math.max(1, Math.min(100, competitiveness));
  }

  private analyzeSellerMotivation(
    property?: BatchDataProperty,
    marketAnalysis?: BatchDataMarketAnalysis
  ): PropertyEnrichmentData['sellerIntelligence'] {
    const indicators: string[] = [];
    const leverage: string[] = [];
    let motivationLevel: 'high' | 'medium' | 'low' = 'medium';

    if (property?.daysOnMarket) {
      if (property.daysOnMarket > 90) {
        indicators.push('Property has been on market for over 90 days');
        leverage.push('Extended market time suggests seller urgency');
        motivationLevel = 'high';
      } else if (property.daysOnMarket > 60) {
        indicators.push('Property has been on market for over 60 days');
        leverage.push('Longer market time provides negotiation opportunity');
      } else if (property.daysOnMarket < 7) {
        indicators.push('Fresh listing - seller may have high expectations');
        motivationLevel = 'low';
      }
    }

    if (property?.ownershipLength && property.ownershipLength > 10) {
      indicators.push('Owner has held property for over 10 years');
      leverage.push('Long-term ownership may indicate flexibility on price');
    }

    if (property?.priceHistory && property.priceHistory.length > 1) {
      const reductions = property.priceHistory.filter(ph => ph.event === 'price_change');
      if (reductions.length > 0) {
        indicators.push(`${reductions.length} price reduction(s) since listing`);
        leverage.push('Price reductions indicate seller motivation');
        motivationLevel = 'high';
      }
    }

    return {
      motivationLevel,
      motivationIndicators: indicators,
      negotiationLeverage: leverage,
      timeOnMarket: property?.daysOnMarket ? `${property.daysOnMarket} days` : 'Unknown'
    };
  }

  private generateInvestmentInsights(
    property?: BatchDataProperty,
    marketAnalysis?: BatchDataMarketAnalysis,
    comparables?: BatchDataComparable[]
  ): PropertyEnrichmentData['investmentInsights'] {
    const riskFactors: string[] = [];
    const opportunities: string[] = [];

    // Analyze market conditions
    if (marketAnalysis?.marketTrend === 'hot') {
      opportunities.push('Hot market with strong appreciation potential');
    } else if (marketAnalysis?.marketTrend === 'cold') {
      riskFactors.push('Cold market may limit short-term appreciation');
      opportunities.push('Potential buyer\'s market with negotiation opportunities');
    }

    // Analyze days on market vs. market average
    if (property?.daysOnMarket && marketAnalysis?.daysOnMarket) {
      if (property.daysOnMarket > marketAnalysis.daysOnMarket * 1.5) {
        opportunities.push('Property priced above market - negotiation opportunity');
      }
    }

    // Analyze comparable sales
    if (comparables && comparables.length > 0) {
      const avgCompPrice = comparables.reduce((sum, comp) => sum + (comp.property.lastSalePrice || 0), 0) / comparables.length;
      if (property?.estimatedValue && avgCompPrice > property.estimatedValue * 1.1) {
        opportunities.push('Property potentially undervalued based on comparables');
      }
    }

    return {
      riskFactors,
      opportunities
    };
  }

  private createFallbackEnrichment(
    address: string,
    existingData?: any
  ): PropertyEnrichmentData {
    // Create basic enrichment from existing data when BatchData is unavailable
    const basePrice = existingData?.price || 500000;
    const daysOnMarket = existingData?.daysOnMarket || 30;

    return {
      property: {
        id: address,
        address: address,
        estimatedValue: basePrice,
        daysOnMarket: daysOnMarket
      },
      marketAnalysis: {
        medianPrice: basePrice,
        averagePrice: basePrice,
        marketTrend: 'balanced',
        competitiveness: 50
      },
      comparables: [],
      sellerIntelligence: {
        motivationLevel: daysOnMarket > 60 ? 'high' : daysOnMarket > 30 ? 'medium' : 'low',
        motivationIndicators: [`${daysOnMarket} days on market`],
        negotiationLeverage: daysOnMarket > 60 ? ['Extended market time'] : [],
        timeOnMarket: `${daysOnMarket} days`
      },
      investmentInsights: {
        riskFactors: ['Limited market data available'],
        opportunities: ['Full analysis requires BatchData integration']
      },
      dataConfidence: 30,
      lastUpdated: new Date().toISOString(),
      dataSources: ['Fallback']
    };
  }

  // Check if BatchData enrichment is available
  isEnrichmentAvailable(): boolean {
    return this.batchData.isAvailable();
  }

  // Get enrichment status
  getEnrichmentStatus(): { available: boolean; source: string; message: string } {
    if (this.batchData.isAvailable()) {
      return {
        available: true,
        source: 'BatchData',
        message: 'Full property enrichment available'
      };
    } else {
      return {
        available: false,
        source: 'Fallback',
        message: 'Limited enrichment - BatchData integration pending'
      };
    }
  }
}