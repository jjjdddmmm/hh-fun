import Anthropic from '@anthropic-ai/sdk';
import { logger } from "@/lib/utils/logger";
import { ZillowPropertyData } from './zillow-api';

export interface PropertyAnalysisResult {
  marketValue: {
    low: number;
    high: number;
    estimated: number;
    confidence: number;
  };
  recommendation: 'excellent' | 'good' | 'fair' | 'overpriced' | 'investigate';
  keyInsights: string[];
  redFlags: string[];
  investmentScore: number;
  negotiationStrategy: {
    suggestedOffer: number;
    tactics: string[];
    leverage: string[];
  };
  financialProjection: {
    monthlyMortgage: number;
    downPayment: number;
    closingCosts: number;
    monthlyExpenses: number;
    cashFlow: number;
  };
  marketAnalysis: {
    pricePerSqftComparison: string;
    marketTrend: string;
    demandLevel: string;
    appreciation: string;
  };
  aiConfidence: number;
  analysis: string;
}

export interface InvestmentParameters {
  downPayment: number;
  interestRate: number;
  loanTerm: number;
  monthlyRent?: number;
  propertyTaxes?: number;
  insurance?: number;
  maintenance?: number;
  vacancy?: number;
  capEx?: number;
  propertyManagement?: number;
  investmentGoal: 'cashflow' | 'appreciation' | 'both';
  timeHorizon: number;
}

export interface InvestmentAnalysisResult {
  cashFlow: {
    monthlyIncome: number;
    monthlyExpenses: number;
    netCashFlow: number;
    annualCashFlow: number;
    cashOnCashReturn: number;
  };
  financing: {
    loanAmount: number;
    monthlyPayment: number;
    totalInterest: number;
    payoffTime: number;
  };
  returns: {
    capRate: number;
    grossRentMultiplier: number;
    totalROI: number;
    breakEvenPoint: number;
  };
  appreciation: {
    expectedAnnualAppreciation: number;
    fiveYearValue: number;
    tenYearValue: number;
    totalReturn: number;
  };
  risks: {
    vacancyImpact: number;
    interestRateRisk: string;
    marketRisk: string;
    liquidityRisk: string;
  };
  recommendation: {
    buyDecision: 'strong_buy' | 'buy' | 'hold' | 'avoid';
    reasoning: string;
    improvements: string[];
  };
  confidence: number;
  analysis: string;
}

export interface NegotiationParameters {
  budgetMax: number;
  desiredPrice: number;
  timeline: string;
  contingencies: string[];
  leverage: string[];
  marketConditions: string;
}

export interface NegotiationAnalysisResult {
  strategy: {
    initialOffer: number;
    targetPrice: number;
    walkAwayPrice: number;
    escalationPlan: string[];
  };
  tactics: {
    inspectionStrategy: string;
    financingLeverage: string;
    timingAdvantage: string;
    marketPosition: string;
  };
  riskAssessment: {
    competitionLevel: string;
    sellerMotivation: string;
    marketTrend: string;
    propertyCondition: string;
  };
  recommendation: {
    approachStrategy: string;
    keyPoints: string[];
    potentialConcessions: string[];
  };
  confidence: number;
  analysis: string;
}

export class PropertyAIAnalyzer {
  private anthropic: Anthropic;
  
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('❌ ANTHROPIC_API_KEY not found in environment variables');
      throw new Error('ANTHROPIC_API_KEY is required but not set');
    }
    
    logger.debug('✅ ANTHROPIC_API_KEY loaded', { keyLength: apiKey.length });
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }
  
  async generateInsights(propertyData: ZillowPropertyData): Promise<{keyInsights: string[], redFlags: string[], investmentScore: number}> {
    // Generate AI analysis for property
    
    try {
      const pricePerSqft = propertyData.pricePerSqft || (propertyData.price && propertyData.livingArea ? Math.round(propertyData.price / propertyData.livingArea) : 0);
      const currentYear = new Date().getFullYear();
      const propertyAge = currentYear - propertyData.yearBuilt;
      
      // Extract zipcode for local expertise
      const zipcode = propertyData.address?.match(/\b\d{5}\b/)?.[0] || propertyData.zipcode || 'Unknown';
      
      const prompt = `You are Sarah Chen, a seasoned real estate investor with 15 years of experience specializing in the ${zipcode} area. You've personally bought, renovated, and sold over 200 properties specifically in ${zipcode} and surrounding neighborhoods. You know this market inside and out - the street-by-street trends, local school districts, development patterns, and exactly what buyers want in this specific area.

PROPERTY TO EVALUATE:
Address: ${propertyData.address || 'Property details'}
Price: $${propertyData.price?.toLocaleString() || 'Unknown'}
Size: ${propertyData.livingArea} sq ft
Built: ${propertyData.yearBuilt} (${propertyAge} years old)
Days on Market: ${propertyData.daysOnZillow || 'New listing'}
Price per sq ft: $${pricePerSqft}
${propertyData.zestimate?.amount ? `Zestimate: $${propertyData.zestimate.amount.toLocaleString()} (Range: $${propertyData.zestimate.valuationRange.low.toLocaleString()} - $${propertyData.zestimate.valuationRange.high.toLocaleString()})` : ''}
${propertyData.rentZestimate ? `Rent Estimate: $${propertyData.rentZestimate.toLocaleString()}/month` : ''}

As a local expert in the ${zipcode} area, evaluate this property like you would for your own investment portfolio. Consider:

• Your deep knowledge of ${zipcode} market trends and pricing
• What you know about this specific neighborhood's growth potential
• Property condition and renovation needs based on the build year
• How this property compares to others you've seen in the area
• Current market timing and buyer demand
• Rental potential if this were an investment property
• Exit strategy and resale potential

Based on your expertise, what investment score (1-100) would you give this property? Consider:
- 85-100: "I'd buy this immediately - excellent opportunity"
- 70-84: "Strong investment with good fundamentals"
- 55-69: "Decent opportunity, worth considering"
- 40-54: "Below average, would need significant upside"
- 25-39: "Poor investment, major concerns"
- 1-24: "Avoid - serious red flags"

Respond with JSON only:
{
  "investmentScore": [Your expert score 1-100 based on local market knowledge],
  "keyInsights": ["insight1 based on local expertise", "insight2", "insight3"],
  "redFlags": ["flag1 if any", "flag2 if any"]
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 600,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            investmentScore: parsed.investmentScore || 50,
            keyInsights: parsed.keyInsights || ['Property analysis completed'],
            redFlags: parsed.redFlags || []
          };
        }
      }
      
      return { investmentScore: 50, keyInsights: ['Property analysis completed'], redFlags: [] };
    } catch (error) {
      logger.error('❌ AI Insights Error for property:', propertyData.address || propertyData.zpid, {
        error: error instanceof Error ? error.message : String(error),
        propertyId: propertyData.zpid,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        stack: error instanceof Error ? error.stack : undefined
      });
      return { investmentScore: 50, keyInsights: ['Unable to generate insights - check logs'], redFlags: ['AI analysis temporarily unavailable'] };
    }
  }

  async analyzeProperty(propertyData: ZillowPropertyData): Promise<PropertyAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(propertyData);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseAIResponse(content.text, propertyData);
      }
      
      throw new Error('Invalid response format from AI');
    } catch (error) {
      logger.error('❌ AI Full Analysis Error for property:', propertyData.address || propertyData.zpid, {
        error: error instanceof Error ? error.message : String(error),
        propertyId: propertyData.zpid,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        stack: error instanceof Error ? error.stack : undefined
      });
      logger.warn('🔄 Using fallback analysis for property', { 
        propertyAddress: propertyData.address || propertyData.zpid 
      });
      return this.fallbackAnalysis(propertyData);
    }
  }
  
  async analyzeInvestment(property: any, params: InvestmentParameters): Promise<InvestmentAnalysisResult> {
    const prompt = this.buildInvestmentPrompt(property, params);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseInvestmentResponse(content.text, property, params);
      }
      
      throw new Error('Invalid response format from AI');
    } catch (error) {
      logger.error('AI Investment Analysis Error:', error);
      return this.fallbackInvestmentAnalysis(property, params);
    }
  }

  async analyzeNegotiation(property: any, params: NegotiationParameters): Promise<NegotiationAnalysisResult> {
    const prompt = this.buildNegotiationPrompt(property, params);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseNegotiationResponse(content.text, property, params);
      }
      
      throw new Error('Invalid response format from AI');
    } catch (error) {
      logger.error('AI Negotiation Analysis Error:', error);
      return this.fallbackNegotiationAnalysis(property, params);
    }
  }
  
  private buildAnalysisPrompt(data: ZillowPropertyData): string {
    const propertyDetails = `
Property Analysis Request:
- Address: ${data.address}
- Price: $${data.price?.toLocaleString() || 'Unknown'}
- Square Footage: ${data.livingArea} sq ft
- Bedrooms: ${data.bedrooms}
- Bathrooms: ${data.bathrooms}
- Year Built: ${data.yearBuilt}
- Property Type: ${data.propertyType}
- Days on Market: ${data.daysOnZillow || 'Unknown'}
- Price per Sq Ft: $${data.pricePerSqft || (data.price && data.livingArea ? Math.round(data.price / data.livingArea) : 'Unknown')}
- Zestimate: ${data.zestimate?.amount ? `$${data.zestimate.amount.toLocaleString()} (Range: $${data.zestimate.valuationRange?.low?.toLocaleString() || 'Unknown'} - $${data.zestimate.valuationRange?.high?.toLocaleString() || 'Unknown'})` : 'Not available'}
- Property Taxes: ${data.propertyTaxes ? `$${data.propertyTaxes.toLocaleString()}/year` : 'Unknown'}
- HOA Fees: ${data.hoaFee ? `$${data.hoaFee.toLocaleString()}/month` : 'None'}
- Lot Size: ${data.lotSize || 'Unknown'}
- Features: ${data.features ? Object.entries(data.features).filter(([_, v]) => v).map(([k, _]) => k).join(', ') : 'None listed'}
`;

    // Extract zipcode for Sarah Chen's local expertise
    const zipcode = data.address.match(/\b\d{5}\b/)?.[0] || 'Unknown';
    
    return `You are Sarah Chen, a seasoned real estate investor with 15 years of experience specializing in the ${zipcode} area. You've personally bought, renovated, and sold over 200 properties specifically in ${zipcode} and surrounding neighborhoods. You know this market inside and out - the street-by-street trends, local school districts, development patterns, and exactly what buyers want in this specific area.

${propertyDetails}

As a local expert in the ${zipcode} area, analyze this property comprehensively and provide actionable insights, with special focus on educating buyers about offer strategy components based on your deep local market knowledge.

Please provide a detailed analysis in the following JSON format:
{
  "marketValue": {
    "low": number,
    "high": number, 
    "estimated": number,
    "confidence": number (0-100)
  },
  "recommendation": "excellent" | "good" | "fair" | "overpriced" | "investigate",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "redFlags": ["flag1", "flag2"],
  "investmentScore": number (0-100),
  "negotiationStrategy": {
    "suggestedOffer": number,
    "tactics": ["Comprehensive offer strategy tactic 1", "Market positioning tactic 2", "Timeline leverage tactic 3", "Inspection strategy tactic 4"],
    "leverage": ["Days on market analysis", "Comparable sales data", "Property condition factors", "Market conditions insight"]
  },
  "financialProjection": {
    "monthlyMortgage": number,
    "downPayment": number,
    "closingCosts": number,
    "monthlyExpenses": number,
    "cashFlow": number
  },
  "marketAnalysis": {
    "pricePerSqftComparison": "above/below/on par with market",
    "marketTrend": "hot/warm/cold/declining",
    "demandLevel": "high/medium/low",
    "appreciation": "strong/moderate/weak/declining"
  },
  "aiConfidence": number (0-100),
  "analysis": "detailed written analysis paragraph"
}

Key considerations:
1. Compare asking price to Zestimate and market data
2. Evaluate property condition based on age and features
3. Consider market timing and days on market
4. Factor in location, schools, and neighborhood trends
5. Calculate realistic investment returns
6. Identify negotiation opportunities
7. Assess long-term appreciation potential
8. Consider maintenance and renovation needs
9. Evaluate rental potential if applicable
10. Factor in local market conditions

SPECIAL FOCUS ON OFFER STRATEGY EDUCATION (Use your local ${zipcode} expertise):
For negotiationStrategy, provide educational insights based on your deep knowledge of the ${zipcode} market:
- Tactics: Focus on explaining WHY certain tactics work IN THIS SPECIFIC MARKET (e.g., "In ${zipcode}, sellers typically respond well to inspection contingencies because..." or "Based on my ${zipcode} experience, properties with X days on market usually...")
- Leverage: Explain specific data points buyers should understand FOR THIS AREA (e.g., "In ${zipcode}, I've seen sellers accept 3-5% below asking when..." or "Properties in this neighborhood typically have X advantage...")
- Provide actionable education about offer components like contingencies, timelines, financing terms, and market positioning SPECIFIC TO ${zipcode}

As Sarah Chen, provide realistic, conservative estimates based on your actual ${zipcode} market experience. Be thorough but educational in your analysis.`;
  }

  private buildInvestmentPrompt(property: any, params: InvestmentParameters): string {
    const price = Number(property.price) / 100; // Convert from cents
    const monthlyRent = params.monthlyRent || (price * 0.01); // 1% rule fallback
    
    return `You are a real estate investment expert. Analyze this investment opportunity:

Property Details:
- Address: ${property.address}
- Purchase Price: $${price.toLocaleString()}
- Square Footage: ${property.squareFootage || 'Unknown'}
- Bedrooms: ${property.bedrooms || 'Unknown'}
- Bathrooms: ${property.bathrooms || 'Unknown'}
- Year Built: ${property.yearBuilt || 'Unknown'}
- Property Type: ${property.propertyType || 'Unknown'}

Investment Parameters:
- Down Payment: $${params.downPayment.toLocaleString()}
- Interest Rate: ${params.interestRate}%
- Loan Term: ${params.loanTerm} years
- Expected Monthly Rent: $${monthlyRent.toLocaleString()}
- Property Taxes: $${params.propertyTaxes || 'Unknown'}/year
- Insurance: $${params.insurance || 'Unknown'}/year
- Maintenance: $${params.maintenance || 'Unknown'}/year
- Vacancy Rate: ${params.vacancy || 5}%
- CapEx: $${params.capEx || 'Unknown'}/year
- Property Management: ${params.propertyManagement || 0}%
- Investment Goal: ${params.investmentGoal}
- Time Horizon: ${params.timeHorizon} years

Provide a detailed investment analysis in this JSON format:
{
  "cashFlow": {
    "monthlyIncome": number,
    "monthlyExpenses": number,
    "netCashFlow": number,
    "annualCashFlow": number,
    "cashOnCashReturn": number
  },
  "financing": {
    "loanAmount": number,
    "monthlyPayment": number,
    "totalInterest": number,
    "payoffTime": number
  },
  "returns": {
    "capRate": number,
    "grossRentMultiplier": number,
    "totalROI": number,
    "breakEvenPoint": number
  },
  "appreciation": {
    "expectedAnnualAppreciation": number,
    "fiveYearValue": number,
    "tenYearValue": number,
    "totalReturn": number
  },
  "risks": {
    "vacancyImpact": number,
    "interestRateRisk": "low/medium/high",
    "marketRisk": "low/medium/high",
    "liquidityRisk": "low/medium/high"
  },
  "recommendation": {
    "buyDecision": "strong_buy" | "buy" | "hold" | "avoid",
    "reasoning": "detailed explanation",
    "improvements": ["suggestion1", "suggestion2"]
  },
  "confidence": number (0-100),
  "analysis": "comprehensive written analysis"
}

Calculate all financial metrics accurately. Consider local market conditions, property condition, and investment timeline. Provide conservative estimates.`;
  }

  private buildNegotiationPrompt(property: any, params: NegotiationParameters): string {
    const price = Number(property.price) / 100;
    
    return `You are a master real estate negotiator. Develop a comprehensive negotiation strategy for this property:

Property Details:
- Address: ${property.address}
- Asking Price: $${price.toLocaleString()}
- Days on Market: ${property.daysOnMarket || 'Unknown'}
- Square Footage: ${property.squareFootage || 'Unknown'}
- Year Built: ${property.yearBuilt || 'Unknown'}
- Property Type: ${property.propertyType || 'Unknown'}

Buyer Parameters:
- Maximum Budget: $${params.budgetMax.toLocaleString()}
- Desired Price: $${params.desiredPrice.toLocaleString()}
- Timeline: ${params.timeline}
- Contingencies: ${params.contingencies.join(', ')}
- Leverage Points: ${params.leverage.join(', ')}
- Market Conditions: ${params.marketConditions}

Provide a detailed negotiation strategy in this JSON format:
{
  "strategy": {
    "initialOffer": number,
    "targetPrice": number,
    "walkAwayPrice": number,
    "escalationPlan": ["step1", "step2", "step3"]
  },
  "tactics": {
    "inspectionStrategy": "detailed approach",
    "financingLeverage": "how to use financing",
    "timingAdvantage": "timing considerations",
    "marketPosition": "market positioning"
  },
  "riskAssessment": {
    "competitionLevel": "high/medium/low",
    "sellerMotivation": "high/medium/low",
    "marketTrend": "buyer/seller/neutral",
    "propertyCondition": "excellent/good/fair/poor"
  },
  "recommendation": {
    "approachStrategy": "overall approach",
    "keyPoints": ["point1", "point2", "point3"],
    "potentialConcessions": ["concession1", "concession2"]
  },
  "confidence": number (0-100),
  "analysis": "comprehensive negotiation analysis"
}

Consider market psychology, seller motivation, property factors, and timing. Provide realistic, strategic advice.`;
  }
  
  private parseAIResponse(aiResponse: string, propertyData: ZillowPropertyData): PropertyAnalysisResult {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('❌ No JSON found in AI response for property:', propertyData.address || propertyData.zpid);
        logger.error('AI Response:', aiResponse.substring(0, 500));
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        marketValue: {
          low: parsed.marketValue?.low || propertyData.price * 0.9,
          high: parsed.marketValue?.high || propertyData.price * 1.1,
          estimated: parsed.marketValue?.estimated || propertyData.price,
          confidence: parsed.marketValue?.confidence || 75
        },
        recommendation: parsed.recommendation || 'investigate',
        keyInsights: parsed.keyInsights || ['Analysis generated successfully'],
        redFlags: parsed.redFlags || [],
        investmentScore: parsed.investmentScore || 50,
        negotiationStrategy: {
          suggestedOffer: parsed.negotiationStrategy?.suggestedOffer || propertyData.price * 0.95,
          tactics: parsed.negotiationStrategy?.tactics || ['Standard market offer'],
          leverage: parsed.negotiationStrategy?.leverage || ['Market analysis']
        },
        financialProjection: {
          monthlyMortgage: parsed.financialProjection?.monthlyMortgage || Math.round(propertyData.price * 0.004),
          downPayment: parsed.financialProjection?.downPayment || Math.round(propertyData.price * 0.2),
          closingCosts: parsed.financialProjection?.closingCosts || Math.round(propertyData.price * 0.03),
          monthlyExpenses: parsed.financialProjection?.monthlyExpenses || 500,
          cashFlow: parsed.financialProjection?.cashFlow || 0
        },
        marketAnalysis: {
          pricePerSqftComparison: parsed.marketAnalysis?.pricePerSqftComparison || 'on par with market',
          marketTrend: parsed.marketAnalysis?.marketTrend || 'warm',
          demandLevel: parsed.marketAnalysis?.demandLevel || 'medium',
          appreciation: parsed.marketAnalysis?.appreciation || 'moderate'
        },
        aiConfidence: parsed.aiConfidence || 85,
        analysis: parsed.analysis || 'Property analysis completed successfully.'
      };
    } catch (error) {
      logger.error('❌ Error parsing AI response for property:', error instanceof Error ? error : new Error(String(error)), { 
        propertyAddress: propertyData.address || propertyData.zpid 
      });
      return this.fallbackAnalysis(propertyData);
    }
  }

  private parseInvestmentResponse(aiResponse: string, property: any, params: InvestmentParameters): InvestmentAnalysisResult {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        cashFlow: {
          monthlyIncome: parsed.cashFlow?.monthlyIncome || 0,
          monthlyExpenses: parsed.cashFlow?.monthlyExpenses || 0,
          netCashFlow: parsed.cashFlow?.netCashFlow || 0,
          annualCashFlow: parsed.cashFlow?.annualCashFlow || 0,
          cashOnCashReturn: parsed.cashFlow?.cashOnCashReturn || 0
        },
        financing: {
          loanAmount: parsed.financing?.loanAmount || 0,
          monthlyPayment: parsed.financing?.monthlyPayment || 0,
          totalInterest: parsed.financing?.totalInterest || 0,
          payoffTime: parsed.financing?.payoffTime || params.loanTerm
        },
        returns: {
          capRate: parsed.returns?.capRate || 0,
          grossRentMultiplier: parsed.returns?.grossRentMultiplier || 0,
          totalROI: parsed.returns?.totalROI || 0,
          breakEvenPoint: parsed.returns?.breakEvenPoint || 0
        },
        appreciation: {
          expectedAnnualAppreciation: parsed.appreciation?.expectedAnnualAppreciation || 3,
          fiveYearValue: parsed.appreciation?.fiveYearValue || 0,
          tenYearValue: parsed.appreciation?.tenYearValue || 0,
          totalReturn: parsed.appreciation?.totalReturn || 0
        },
        risks: {
          vacancyImpact: parsed.risks?.vacancyImpact || 0,
          interestRateRisk: parsed.risks?.interestRateRisk || 'medium',
          marketRisk: parsed.risks?.marketRisk || 'medium',
          liquidityRisk: parsed.risks?.liquidityRisk || 'medium'
        },
        recommendation: {
          buyDecision: parsed.recommendation?.buyDecision || 'hold',
          reasoning: parsed.recommendation?.reasoning || 'Analysis completed',
          improvements: parsed.recommendation?.improvements || []
        },
        confidence: parsed.confidence || 80,
        analysis: parsed.analysis || 'Investment analysis completed successfully.'
      };
    } catch (error) {
      logger.error('Error parsing investment response:', error);
      return this.fallbackInvestmentAnalysis(property, params);
    }
  }

  private parseNegotiationResponse(aiResponse: string, property: any, params: NegotiationParameters): NegotiationAnalysisResult {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        strategy: {
          initialOffer: parsed.strategy?.initialOffer || params.desiredPrice,
          targetPrice: parsed.strategy?.targetPrice || params.desiredPrice,
          walkAwayPrice: parsed.strategy?.walkAwayPrice || params.budgetMax,
          escalationPlan: parsed.strategy?.escalationPlan || ['Standard negotiation']
        },
        tactics: {
          inspectionStrategy: parsed.tactics?.inspectionStrategy || 'Standard inspection',
          financingLeverage: parsed.tactics?.financingLeverage || 'Pre-approval advantage',
          timingAdvantage: parsed.tactics?.timingAdvantage || 'Market timing',
          marketPosition: parsed.tactics?.marketPosition || 'Competitive offer'
        },
        riskAssessment: {
          competitionLevel: parsed.riskAssessment?.competitionLevel || 'medium',
          sellerMotivation: parsed.riskAssessment?.sellerMotivation || 'medium',
          marketTrend: parsed.riskAssessment?.marketTrend || 'neutral',
          propertyCondition: parsed.riskAssessment?.propertyCondition || 'good'
        },
        recommendation: {
          approachStrategy: parsed.recommendation?.approachStrategy || 'Balanced approach',
          keyPoints: parsed.recommendation?.keyPoints || ['Market analysis'],
          potentialConcessions: parsed.recommendation?.potentialConcessions || ['Flexible closing']
        },
        confidence: parsed.confidence || 80,
        analysis: parsed.analysis || 'Negotiation analysis completed successfully.'
      };
    } catch (error) {
      logger.error('Error parsing negotiation response:', error);
      return this.fallbackNegotiationAnalysis(property, params);
    }
  }
  
  private fallbackAnalysis(propertyData: ZillowPropertyData): PropertyAnalysisResult {
    const pricePerSqft = propertyData.pricePerSqft || Math.round(propertyData.price / propertyData.livingArea);
    const isOverpriced = propertyData.zestimate ? 
      ((propertyData.price - propertyData.zestimate.amount) / propertyData.zestimate.amount) > 0.05 : false;
    
    // Calculate a more realistic investment score based on property characteristics
    let investmentScore = 50; // Base score
    
    // Adjust based on price vs zestimate
    if (propertyData.zestimate) {
      const priceDifference = (propertyData.price - propertyData.zestimate.amount) / propertyData.zestimate.amount;
      if (priceDifference < -0.1) investmentScore += 20; // Great deal
      else if (priceDifference < -0.05) investmentScore += 10; // Good deal
      else if (priceDifference > 0.1) investmentScore -= 20; // Overpriced
      else if (priceDifference > 0.05) investmentScore -= 10; // Slightly overpriced
    }
    
    // Adjust based on property age
    const propertyAge = new Date().getFullYear() - propertyData.yearBuilt;
    if (propertyAge < 10) investmentScore += 10; // Newer property
    else if (propertyAge > 50) investmentScore -= 10; // Older property
    
    // Adjust based on days on market
    if (propertyData.daysOnZillow) {
      if (propertyData.daysOnZillow > 90) investmentScore -= 15; // Stale listing
      else if (propertyData.daysOnZillow > 60) investmentScore -= 5; // Extended market time
      else if (propertyData.daysOnZillow < 7) investmentScore += 5; // Fresh listing
    }
    
    // Ensure score stays within bounds
    investmentScore = Math.max(1, Math.min(100, investmentScore));
    
    logger.warn('🔄 Using calculated fallback investment score', { 
      investmentScore, 
      propertyAddress: propertyData.address || propertyData.zpid 
    });
    
    return {
      marketValue: {
        low: propertyData.zestimate?.valuationRange.low || propertyData.price * 0.95,
        high: propertyData.zestimate?.valuationRange.high || propertyData.price * 1.05,
        estimated: propertyData.zestimate?.amount || propertyData.price,
        confidence: 70
      },
      recommendation: isOverpriced ? 'overpriced' : 'fair',
      keyInsights: [
        `Property is ${propertyData.yearBuilt > 2010 ? 'relatively new' : 'established'}`,
        `Price per square foot: $${pricePerSqft}`,
        `${propertyData.daysOnZillow && propertyData.daysOnZillow > 60 ? 'Extended time on market' : 'Recent listing'}`
      ],
      redFlags: isOverpriced ? ['Price above market estimate'] : [],
      investmentScore: investmentScore,
      negotiationStrategy: {
        suggestedOffer: propertyData.price * 0.97,
        tactics: ['Market comparison', 'Inspection contingency'],
        leverage: ['Days on market', 'Comparable sales']
      },
      financialProjection: {
        monthlyMortgage: Math.round(propertyData.price * 0.004),
        downPayment: Math.round(propertyData.price * 0.2),
        closingCosts: Math.round(propertyData.price * 0.03),
        monthlyExpenses: 500,
        cashFlow: 0
      },
      marketAnalysis: {
        pricePerSqftComparison: 'on par with market',
        marketTrend: 'warm',
        demandLevel: 'medium',
        appreciation: 'moderate'
      },
      aiConfidence: 70,
      analysis: 'Fallback analysis used due to AI processing issue. Property appears to be fairly priced based on available data.'
    };
  }

  private fallbackInvestmentAnalysis(property: any, params: InvestmentParameters): InvestmentAnalysisResult {
    const price = Number(property.price) / 100;
    const loanAmount = price - params.downPayment;
    const monthlyRate = params.interestRate / 100 / 12;
    const numPayments = params.loanTerm * 12;
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const monthlyRent = params.monthlyRent || (price * 0.01);
    
    return {
      cashFlow: {
        monthlyIncome: monthlyRent,
        monthlyExpenses: monthlyPayment + 500,
        netCashFlow: monthlyRent - monthlyPayment - 500,
        annualCashFlow: (monthlyRent - monthlyPayment - 500) * 12,
        cashOnCashReturn: ((monthlyRent - monthlyPayment - 500) * 12) / params.downPayment * 100
      },
      financing: {
        loanAmount,
        monthlyPayment,
        totalInterest: monthlyPayment * numPayments - loanAmount,
        payoffTime: params.loanTerm
      },
      returns: {
        capRate: (monthlyRent * 12) / price * 100,
        grossRentMultiplier: price / (monthlyRent * 12),
        totalROI: 8,
        breakEvenPoint: 10
      },
      appreciation: {
        expectedAnnualAppreciation: 3,
        fiveYearValue: price * Math.pow(1.03, 5),
        tenYearValue: price * Math.pow(1.03, 10),
        totalReturn: 8
      },
      risks: {
        vacancyImpact: monthlyRent * 0.05,
        interestRateRisk: 'medium',
        marketRisk: 'medium',
        liquidityRisk: 'medium'
      },
      recommendation: {
        buyDecision: 'hold',
        reasoning: 'Fallback analysis - detailed review recommended',
        improvements: ['Get accurate rental comps', 'Review local market conditions']
      },
      confidence: 60,
      analysis: 'Basic investment analysis completed. Consider getting professional evaluation.'
    };
  }

  private fallbackNegotiationAnalysis(property: any, params: NegotiationParameters): NegotiationAnalysisResult {
    return {
      strategy: {
        initialOffer: params.desiredPrice,
        targetPrice: params.desiredPrice,
        walkAwayPrice: params.budgetMax,
        escalationPlan: ['Initial offer', 'Counter-offer', 'Final offer']
      },
      tactics: {
        inspectionStrategy: 'Standard inspection contingency',
        financingLeverage: 'Pre-approval advantage',
        timingAdvantage: 'Flexible closing timeline',
        marketPosition: 'Competitive market offer'
      },
      riskAssessment: {
        competitionLevel: 'medium',
        sellerMotivation: 'medium',
        marketTrend: 'neutral',
        propertyCondition: 'good'
      },
      recommendation: {
        approachStrategy: 'Balanced negotiation approach',
        keyPoints: ['Market analysis', 'Property condition', 'Financing terms'],
        potentialConcessions: ['Flexible closing date', 'Inspection timeline']
      },
      confidence: 70,
      analysis: 'Basic negotiation strategy developed. Consider market research for optimal approach.'
    };
  }
}

export function createAIAnalyzer(): PropertyAIAnalyzer {
  return new PropertyAIAnalyzer();
}