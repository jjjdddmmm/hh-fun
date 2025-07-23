import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

export interface NegotiationAnalysis {
  recommendedOffer: {
    amount: number;
    confidence: number;
    reasoning: string[];
  };
  alternativeOffers: {
    aggressive: { amount: number; successProbability: number };
    moderate: { amount: number; successProbability: number };
    conservative: { amount: number; successProbability: number };
  };
  negotiationStrategies: {
    strategy: string;
    talkingPoints: string[];
    leverage: string[];
    risks: string[];
  }[];
  sellerMotivation: {
    level: 'high' | 'medium' | 'low';
    indicators: string[];
    timeOnMarket: string;
  };
  marketPosition: {
    overpriced: boolean;
    percentageOverMarket: number;
    comparableProperties: any[];
  };
  dealBreakers: string[];
  hiddenOpportunities: string[];
  confidenceScore: number;
}

export class DealMakerAgent {
  private anthropic: Anthropic;
  
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for DealMakerAgent');
    }
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyzeAndNegotiate(
    propertyData: any,
    buyerProfile: {
      maxBudget: number;
      downPaymentAvailable: number;
      creditScore?: number;
      firstTimeBuyer: boolean;
      investmentGoals?: string;
    },
    marketData?: any // Will be populated by BatchData later
  ): Promise<NegotiationAnalysis> {
    try {
      const prompt = this.buildNegotiationPrompt(propertyData, buyerProfile, marketData);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent financial analysis
        messages: [{ role: 'user', content: prompt }]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let analysis: NegotiationAnalysis;
          
          try {
            // Try to parse the JSON directly
            analysis = JSON.parse(jsonMatch[0]) as NegotiationAnalysis;
          } catch (parseError) {
            console.error('❌ JSON parsing failed, attempting to fix malformed JSON:', parseError);
            
            // Try to fix common JSON issues
            let fixedJson = jsonMatch[0]
              // Fix unquoted property names
              .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
              // Fix single quotes to double quotes
              .replace(/'/g, '"')
              // Fix trailing commas
              .replace(/,(\s*[}\]])/g, '$1');
            
            try {
              analysis = JSON.parse(fixedJson) as NegotiationAnalysis;
              console.log('✅ Successfully parsed fixed JSON');
            } catch (secondError) {
              console.error('❌ Failed to fix JSON, using fallback analysis');
              return this.getFallbackAnalysis(propertyData, buyerProfile);
            }
          }
          
          // Save to database for learning and analysis
          await this.saveAnalysis(propertyData, buyerProfile, analysis);
          
          return analysis;
        }
      }
      
      throw new Error('Failed to parse negotiation analysis');
    } catch (error) {
      console.error('DealMakerAgent error:', error);
      return this.getFallbackAnalysis(propertyData, buyerProfile);
    }
  }

  private buildNegotiationPrompt(
    propertyData: any,
    buyerProfile: any,
    marketData?: any
  ): string {
    const listPrice = propertyData.price;
    const daysOnMarket = propertyData.daysOnMarket || propertyData.daysOnZillow || 0;
    const priceHistory = propertyData.priceHistory || [];
    
    // Extract BatchData intelligence for enhanced analysis
    const batchIntel = this.extractBatchDataIntelligence(propertyData, marketData);
    
    return `You are an elite real estate investor and negotiation expert with 20 years of experience helping buyers get homes they didn't think they could afford. You specialize in data-driven negotiation strategies using comprehensive property intelligence.

PROPERTY DETAILS:
- Address: ${propertyData.address}
- List Price: $${listPrice.toLocaleString()}
- Days on Market: ${daysOnMarket} days
- Year Built: ${propertyData.yearBuilt}
- Square Feet: ${propertyData.livingArea || propertyData.sqft}
- Bedrooms/Bathrooms: ${propertyData.bedrooms}/${propertyData.bathrooms}
- Price History: ${JSON.stringify(priceHistory)}
- Estimated Value: $${propertyData.zestimate?.amount?.toLocaleString() || propertyData.estimatedValue?.toLocaleString() || 'N/A'}
- Rent Estimate: $${propertyData.rentZestimate?.toLocaleString() || propertyData.estimatedRent?.toLocaleString() || 'N/A'}/month

BUYER PROFILE:
- Maximum Budget: $${buyerProfile.maxBudget.toLocaleString()}
- Down Payment Available: $${buyerProfile.downPaymentAvailable.toLocaleString()}
- Preferred Price Range: $${buyerProfile.preferredPrice?.toLocaleString() || 'Not specified'}
- Credit Score: ${buyerProfile.creditScore || 'Not provided'}
- First Time Buyer: ${buyerProfile.firstTimeBuyer ? 'Yes' : 'No'}
- Investment Goals: ${buyerProfile.investmentGoals || 'Primary residence'}

CRITICAL PRICING STRATEGY:
- NEVER suggest offers at or above the buyer's maximum budget ($${buyerProfile.maxBudget.toLocaleString()})
- Optimal offers should be 5-15% below list price when market conditions allow
- Consider buyer's preferred price ($${(buyerProfile.preferredPrice || buyerProfile.maxBudget * 0.9).toLocaleString()}) as starting point
- Factor in closing costs (~3% of purchase price) and inspection/repair allowances
- Preserve buyer's financial safety margin - don't max out their budget

🔥 ENHANCED BATCHDATA INTELLIGENCE:
${batchIntel}

IRON-CLAD NEGOTIATION STRATEGY:
Use this comprehensive intelligence to craft precise, data-driven offer strategies. Focus on:

1. OWNER MOTIVATION ANALYSIS: How motivated is the seller based on ownership patterns, equity position, and property status?
2. FINANCIAL LEVERAGE: What financial pressures or advantages does the seller have?
3. MARKET POSITIONING: How is this property positioned vs comparable sales and market conditions?
4. NEGOTIATION WINDOWS: What specific leverage points give this buyer maximum advantage?
5. RISK-ADJUSTED PRICING: What's the optimal offer that maximizes acceptance probability while minimizing buyer risk?

Your mission: Get this buyer the absolute best deal possible using data, not emotions.

CRITICAL: Respond with ONLY valid JSON format. Use double quotes for all property names and string values. No comments, no extra text, just pure JSON.

{
  "recommendedOffer": {
    "amount": 450000,
    "confidence": 85,
    "reasoning": ["reason 1", "reason 2", "reason 3"]
  },
  "alternativeOffers": {
    "aggressive": { "amount": [10-15% below list], "successProbability": [0-100] },
    "moderate": { "amount": [5-10% below list], "successProbability": [0-100] },
    "conservative": { "amount": [2-5% below list], "successProbability": [0-100] }
  },
  "negotiationStrategies": [
    {
      "strategy": "Strategy name",
      "talkingPoints": ["point 1", "point 2"],
      "leverage": ["leverage 1", "leverage 2"],
      "risks": ["risk 1", "risk 2"]
    }
  ],
  "sellerMotivation": {
    "level": "high|medium|low",
    "indicators": ["indicator 1", "indicator 2"],
    "timeOnMarket": "interpretation of ${daysOnMarket} days"
  },
  "marketPosition": {
    "overpriced": true|false,
    "percentageOverMarket": [percentage],
    "comparableProperties": []
  },
  "dealBreakers": ["red flag 1", "red flag 2"],
  "hiddenOpportunities": ["opportunity 1", "opportunity 2"],
  "confidenceScore": [0-100 overall confidence in getting a deal]
}`;
  }

  private async saveAnalysis(
    propertyData: any,
    buyerProfile: any,
    analysis: NegotiationAnalysis
  ): Promise<void> {
    try {
      await prisma.propertyAnalysis.create({
        data: {
          propertyId: propertyData.zpid,
          analysisType: 'negotiation',
          aiModel: 'claude-3-5-sonnet-20241022',
          analysis: JSON.stringify({
            buyerProfile,
            negotiationAnalysis: analysis,
            timestamp: new Date()
          }),
          confidence: analysis.confidenceScore / 100
        }
      });
    } catch (error) {
      console.error('Failed to save negotiation analysis:', error);
    }
  }

  private getFallbackAnalysis(
    propertyData: any,
    buyerProfile: any
  ): NegotiationAnalysis {
    const listPrice = propertyData.price;
    const maxBudget = buyerProfile.maxBudget;
    const preferredPrice = buyerProfile.preferredPrice || Math.round(maxBudget * 0.9);
    
    // Ensure offers stay well below buyer's maximum budget
    const budgetCap = Math.round(maxBudget * 0.95); // 5% buffer for closing costs
    
    const conservative = Math.min(Math.round(listPrice * 0.97), budgetCap);
    const moderate = Math.min(Math.round(listPrice * 0.93), budgetCap, preferredPrice);
    const aggressive = Math.min(Math.round(listPrice * 0.88), budgetCap);
    
    return {
      recommendedOffer: {
        amount: moderate,
        confidence: 70,
        reasoning: [
          `Offer stays ${Math.round(((maxBudget - moderate) / maxBudget) * 100)}% below your maximum budget`,
          'Standard 7% discount from list price',
          'Preserves financial safety margin for closing costs'
        ]
      },
      alternativeOffers: {
        aggressive: { amount: aggressive, successProbability: 30 },
        moderate: { amount: moderate, successProbability: 60 },
        conservative: { amount: conservative, successProbability: 85 }
      },
      negotiationStrategies: [{
        strategy: 'Standard Market Approach',
        talkingPoints: ['Requesting standard buyer concessions'],
        leverage: ['Market comparison'],
        risks: ['Limited market data']
      }],
      sellerMotivation: {
        level: 'medium',
        indicators: ['Unable to determine without full data'],
        timeOnMarket: `${propertyData.daysOnZillow || 0} days on market`
      },
      marketPosition: {
        overpriced: false,
        percentageOverMarket: 0,
        comparableProperties: []
      },
      dealBreakers: [],
      hiddenOpportunities: ['Full analysis requires BatchData integration'],
      confidenceScore: 50
    };
  }

  /**
   * Extract and format BatchData intelligence for AI analysis
   */
  private extractBatchDataIntelligence(propertyData: any, marketData?: any): string {
    const intel = [];
    
    // === OWNER MOTIVATION INTELLIGENCE ===
    intel.push("🎯 OWNER MOTIVATION INDICATORS:");
    
    if (propertyData.absenteeOwner !== undefined) {
      intel.push(`   • Absentee Owner: ${propertyData.absenteeOwner ? 'YES - Investor/out-of-area owner likely more flexible' : 'NO - Local owner, may be more emotional'}`);
    }
    
    if (propertyData.ownerOccupied !== undefined) {
      intel.push(`   • Owner Occupied: ${propertyData.ownerOccupied ? 'YES - Emotional attachment, lifestyle considerations' : 'NO - Investment property, numbers-focused'}`);
    }
    
    if (propertyData.ownershipLength) {
      const years = propertyData.ownershipLength;
      let insight = years >= 10 ? 'Long ownership suggests life change/motivation' :
                   years >= 5 ? 'Moderate ownership, standard selling timeline' :
                   'Recent purchase, may need compelling offer';
      intel.push(`   • Ownership Length: ${years} years - ${insight}`);
    }
    
    if (propertyData.corporateOwned || propertyData.trustOwned) {
      intel.push(`   • Corporate/Trust Owned: YES - Business decision, less emotional, faster decisions`);
    }
    
    // === FINANCIAL LEVERAGE INTELLIGENCE ===
    intel.push("\n💰 FINANCIAL LEVERAGE ANALYSIS:");
    
    if (propertyData.highEquity !== undefined || propertyData.equityPercent) {
      const equity = propertyData.equityPercent || (propertyData.highEquity ? 'High' : 'Unknown');
      if (propertyData.equityPercent >= 80 || propertyData.highEquity) {
        intel.push(`   • Owner Equity: ${equity}% - HIGH EQUITY = Maximum negotiation flexibility`);
      } else if (propertyData.equityPercent >= 50) {
        intel.push(`   • Owner Equity: ${equity}% - Moderate equity, some flexibility`);
      } else {
        intel.push(`   • Owner Equity: ${equity}% - Lower equity, price sensitivity likely`);
      }
    }
    
    if (propertyData.freeAndClear) {
      intel.push(`   • Free & Clear: YES - No mortgage pressure, pure profit motivation`);
    }
    
    if (propertyData.mortgageBalance || propertyData.totalOpenLienBalance) {
      const debt = propertyData.mortgageBalance || propertyData.totalOpenLienBalance;
      intel.push(`   • Outstanding Debt: $${debt.toLocaleString()} - Affects minimum acceptable price`);
    }
    
    if (propertyData.cashBuyer) {
      intel.push(`   • Previous Cash Buyer: YES - Understands value of quick cash offers`);
    }
    
    // === MARKET POSITIONING INTELLIGENCE ===
    intel.push("\n📊 MARKET POSITIONING:");
    
    if (propertyData.daysOnMarket) {
      const days = propertyData.daysOnMarket;
      let positioning = days > 120 ? 'STALE LISTING - High motivation likely' :
                       days > 60 ? 'Extended time - Seller flexibility increasing' :
                       days > 30 ? 'Normal market time' :
                       'Fresh listing - Limited negotiation room';
      intel.push(`   • Days on Market: ${days} days - ${positioning}`);
    }
    
    if (propertyData.listedBelowMarketPrice) {
      intel.push(`   • Listed Below Market: YES - Already competitively priced, limited discount room`);
    }
    
    if (propertyData.failedListing || propertyData.expiredListing) {
      intel.push(`   • Previous Failed Listing: YES - Motivated seller, realistic pricing needed`);
    }
    
    if (propertyData.pricePerSqft && marketData?.avgPricePerSqft) {
      const propertyPSF = propertyData.pricePerSqft;
      const marketPSF = marketData.avgPricePerSqft;
      const variance = ((propertyPSF - marketPSF) / marketPSF) * 100;
      intel.push(`   • Price Per Sq Ft: $${propertyPSF} vs market avg $${marketPSF} (${variance.toFixed(1)}% ${variance > 0 ? 'above' : 'below'} market)`);
    }
    
    // === INVESTMENT & RISK SIGNALS ===
    intel.push("\n🚨 SPECIAL OPPORTUNITY SIGNALS:");
    
    if (propertyData.distressedProperty) {
      intel.push(`   • Distressed Property: YES - Significant discount opportunity likely`);
    }
    
    if (propertyData.fixAndFlipPotential) {
      intel.push(`   • Fix & Flip Potential: YES - Property needs work, adjust offer for renovation costs`);
    }
    
    if (propertyData.foreclosureStatus && propertyData.foreclosureStatus !== 'none') {
      intel.push(`   • Foreclosure Status: ${propertyData.foreclosureStatus} - High motivation situation`);
    }
    
    if (propertyData.taxDefault) {
      intel.push(`   • Tax Default: YES - Financial pressure, urgent sale likely needed`);
    }
    
    if (propertyData.vacant) {
      intel.push(`   • Vacant Property: YES - Carrying costs creating pressure, condition unknown`);
    }
    
    // === COMPARABLE SALES INTELLIGENCE ===
    if (marketData?.recentComps?.length > 0) {
      intel.push(`\n🏠 RECENT COMPARABLE SALES (${marketData.recentComps.length} properties):`);
      marketData.recentComps.slice(0, 3).forEach((comp: any, i: number) => {
        intel.push(`   ${i + 1}. ${comp.address} - $${comp.soldPrice?.toLocaleString()} (${comp.daysOnMarket} days) - $${comp.pricePerSqft}/sqft`);
      });
      
      if (marketData.avgSalePrice) {
        const listPrice = propertyData.price;
        const variance = ((listPrice - marketData.avgSalePrice) / marketData.avgSalePrice) * 100;
        intel.push(`   • Subject Property vs Comps: ${variance > 0 ? '+' : ''}${variance.toFixed(1)}% ${variance > 0 ? 'above' : 'below'} recent sales`);
      }
    }
    
    // === NEGOTIATION TIMING INTELLIGENCE ===
    intel.push("\n⏰ TIMING FACTORS:");
    
    const currentMonth = new Date().getMonth() + 1; // 1-12
    if (currentMonth >= 11 || currentMonth <= 2) {
      intel.push(`   • Season: Winter months - Historically slower market, buyer advantage`);
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      intel.push(`   • Season: Spring market - High activity, competitive environment`);
    }
    
    if (marketData?.inventoryLevel) {
      intel.push(`   • Market Inventory: ${marketData.inventoryLevel} - Affects negotiation power`);
    }
    
    // === PROPERTY FEATURES AFFECTING VALUE ===
    if (propertyData.pool || propertyData.garageParkingSpaces || propertyData.fireplaceCount) {
      intel.push("\n🏡 VALUE-ADDING FEATURES:");
      if (propertyData.pool) intel.push(`   • Pool: YES - Adds value but also maintenance costs`);
      if (propertyData.garageParkingSpaces) intel.push(`   • Garage: ${propertyData.garageParkingSpaces} spaces`);
      if (propertyData.fireplaceCount) intel.push(`   • Fireplaces: ${propertyData.fireplaceCount}`);
    }
    
    return intel.length > 1 ? intel.join('\n') : 'Limited intelligence available - using basic market data';
  }
}