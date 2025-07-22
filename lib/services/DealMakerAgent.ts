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
          const analysis = JSON.parse(jsonMatch[0]) as NegotiationAnalysis;
          
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
    const daysOnMarket = propertyData.daysOnZillow || 0;
    const priceHistory = propertyData.priceHistory || [];
    
    return `You are an elite real estate investor and negotiation expert with 20 years of experience helping buyers get homes they didn't think they could afford. You specialize in data-driven negotiation strategies that have saved clients millions.

PROPERTY DETAILS:
- Address: ${propertyData.address}
- List Price: $${listPrice.toLocaleString()}
- Days on Market: ${daysOnMarket}
- Year Built: ${propertyData.yearBuilt}
- Square Feet: ${propertyData.livingArea}
- Bedrooms/Bathrooms: ${propertyData.bedrooms}/${propertyData.bathrooms}
- Price History: ${JSON.stringify(priceHistory)}
- Zestimate: $${propertyData.zestimate?.amount?.toLocaleString() || 'N/A'}
- Rent Zestimate: $${propertyData.rentZestimate?.toLocaleString() || 'N/A'}/month

BUYER PROFILE:
- Maximum Budget: $${buyerProfile.maxBudget.toLocaleString()}
- Down Payment Available: $${buyerProfile.downPaymentAvailable.toLocaleString()}
- Credit Score: ${buyerProfile.creditScore || 'Not provided'}
- First Time Buyer: ${buyerProfile.firstTimeBuyer ? 'Yes' : 'No'}
- Investment Goals: ${buyerProfile.investmentGoals || 'Primary residence'}

MARKET INTELLIGENCE:
${marketData ? JSON.stringify(marketData) : 'BatchData integration pending - using public data only'}

NEGOTIATION MISSION:
Help this buyer afford this property through strategic negotiation. Consider ALL factors that could justify a lower offer:
- Market conditions and trends
- Time on market (${daysOnMarket} days - what does this tell us?)
- Price reductions history
- Seasonal factors
- Seller motivation indicators
- Property condition assumptions based on age
- Comparable sales strategy
- Creative financing options
- Inspection contingency leverage
- Closing timeline flexibility

Think like an investor, not an agent. Your goal is to get the best possible deal.

Provide a comprehensive negotiation analysis in JSON format:

{
  "recommendedOffer": {
    "amount": [specific dollar amount],
    "confidence": [0-100 score],
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
    const conservative = Math.round(listPrice * 0.97);
    const moderate = Math.round(listPrice * 0.93);
    const aggressive = Math.round(listPrice * 0.88);
    
    return {
      recommendedOffer: {
        amount: moderate,
        confidence: 70,
        reasoning: [
          'Based on market averages',
          'Standard negotiation range',
          'No advanced market data available'
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

  // Placeholder for BatchData integration
  async enrichWithBatchData(propertyData: any): Promise<any> {
    // TODO: Integrate BatchData API when available
    // This will provide:
    // - Deep comparable analysis
    // - Historical sales data
    // - Neighborhood trends
    // - Off-market insights
    // - Seller information
    return {
      status: 'pending',
      message: 'BatchData integration coming soon'
    };
  }
}