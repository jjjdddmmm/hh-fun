import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const { property, budget, timeline, contingencies, analysis, comparables } = await request.json();
    
    if (!property || !budget) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    
    // Extract zipcode for Sarah Chen's local expertise
    const zipcode = property.address?.match(/\b\d{5}\b/)?.[0] || 'Unknown';
    
    // Build enhanced market intelligence
    const marketIntelligence = analysis ? `
SARAH'S PROPERTY ANALYSIS:
- Investment Score: ${analysis.investmentScore}/100
- Market Value Range: $${analysis.marketValue?.low?.toLocaleString()} - $${analysis.marketValue?.high?.toLocaleString()}
- Fair Market Value: $${analysis.marketValue?.estimated?.toLocaleString()}
- AI Confidence: ${analysis.aiConfidence}%
- Recommendation: ${analysis.recommendation?.toUpperCase()}
- Market Trend: ${analysis.marketAnalysis?.marketTrend}
- Demand Level: ${analysis.marketAnalysis?.demandLevel}
- Price vs Market: ${analysis.marketAnalysis?.pricePerSqftComparison}
- Appreciation Outlook: ${analysis.marketAnalysis?.appreciation}

KEY INSIGHTS:
${analysis.keyInsights?.map((insight: string) => `- ${insight}`).join('\n') || '- No specific insights available'}

RED FLAGS:
${analysis.redFlags?.length > 0 ? analysis.redFlags.map((flag: string) => `- ${flag}`).join('\n') : '- No major red flags identified'}
` : '';

    const comparablesData = comparables && comparables.comparables?.length > 0 ? `
COMPARABLE SALES DATA (${comparables.comparables.length} properties):
- Average Sale Price: $${comparables.stats?.averagePrice?.toLocaleString() || 'N/A'}
- Median Sale Price: $${comparables.stats?.medianPrice?.toLocaleString() || 'N/A'}
- Price Range: $${comparables.stats?.priceRange?.min?.toLocaleString() || 'N/A'} - $${comparables.stats?.priceRange?.max?.toLocaleString() || 'N/A'}
- Average $/Sq Ft: $${comparables.stats?.averagePricePerSqft?.toLocaleString() || 'N/A'}

Recent Sales:
${comparables.comparables.slice(0, 3).map((comp: any) => 
  `- ${comp.address}: $${comp.price?.toLocaleString()} (${comp.priceSource?.toUpperCase()}) - ${comp.squareFootage?.toLocaleString()} sq ft, ${comp.distance?.toFixed(1)} mi away${comp.soldDate ? `, sold ${new Date(comp.soldDate).toLocaleDateString()}` : ''}`
).join('\n')}
` : '';

    // Calculate seller motivation indicators
    const daysOnMarket = property.daysOnMarket || 0;
    const sellerMotivation = daysOnMarket > 60 ? 'HIGH (60+ days on market)' : 
                           daysOnMarket > 30 ? 'MODERATE (30+ days on market)' : 
                           daysOnMarket > 14 ? 'LOW-MODERATE (14+ days on market)' : 
                           'LOW (fresh listing)';

    // Calculate competitive position
    const listPrice = property.price || 0;
    const fairValue = analysis?.marketValue?.estimated || listPrice;
    const pricingPosition = listPrice > fairValue * 1.05 ? 'OVERPRICED (5%+ above fair value)' :
                          listPrice < fairValue * 0.95 ? 'UNDERPRICED (5%+ below fair value)' :
                          'FAIRLY PRICED (within 5% of fair value)';

    const prompt = `You are Sarah Chen, a seasoned real estate investor with 15 years of experience specializing in the ${zipcode} area. You've personally bought, renovated, and sold over 200 properties specifically in ${zipcode} and surrounding neighborhoods. You know this market inside and out.

A client has filled out your interactive offer strategy wizard. Using your deep market analysis and local expertise, provide a comprehensive offer strategy:

PROPERTY DETAILS:
- Address: ${property.address}
- List Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms} | Bathrooms: ${property.bathrooms}
- Square Footage: ${property.sqft || property.squareFootage || property.livingArea} sq ft
- Year Built: ${property.yearBuilt}
- Days on Market: ${property.daysOnMarket || 'New listing'}
- Seller Motivation Level: ${sellerMotivation}
- Pricing Position: ${pricingPosition}

CLIENT'S SITUATION:
- Maximum Budget: $${budget.max?.toLocaleString()}
- Preferred Offer Price: $${budget.preferred?.toLocaleString()}
- Down Payment Available: $${budget.downPayment?.toLocaleString()}
- Closing Timeline: ${timeline.closing}
- Move-in Flexibility: ${timeline.moveIn}
- Selected Contingencies: ${contingencies.join(', ') || 'None selected'}
${marketIntelligence}${comparablesData}

As Sarah Chen, provide a strategic offer recommendation that addresses:

1. **OFFER PRICE STRATEGY**: Specific price recommendation based on market data, comparable sales, and seller motivation
2. **COMPETITIVE POSITIONING**: How to structure the offer to win against likely competition in ${zipcode}
3. **CONTINGENCY TACTICS**: Strategic use of their selected contingencies based on market conditions
4. **TIMELINE LEVERAGE**: How their timeline preferences can be used as negotiation tools
5. **MARKET-SPECIFIC INSIGHTS**: What you know about ${zipcode} that affects this strategy
6. **RISK MITIGATION**: Potential challenges and how to address them
7. **EXECUTION PLAN**: Step-by-step action items for submitting a winning offer

Write as Sarah speaking directly to the client. Use specific data points from the analysis. Be conversational but authoritative. Focus on actionable, data-driven recommendations that reflect your ${zipcode} expertise.

Provide 4-5 paragraphs with concrete, personalized advice.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return NextResponse.json({
        success: true,
        strategy: content.text
      });
    }

    throw new Error('Invalid response format from AI');

  } catch (error) {
    console.error('Custom strategy generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom strategy' },
      { status: 500 }
    );
  }
}