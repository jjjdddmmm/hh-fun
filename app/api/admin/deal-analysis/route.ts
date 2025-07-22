import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';

function isAdminUser(userId: string): boolean {
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  return adminUserIds.includes(userId);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUser(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { propertyData, searchInput } = await request.json();

    if (!propertyData) {
      return NextResponse.json({ error: 'Property data is required' }, { status: 400 });
    }

    console.log('🤖 Deal Maker AI analyzing property...');

    // Extract key data for AI analysis
    const analysisData = {
      address: searchInput.address,
      zipCode: searchInput.zipCode,
      propertyFound: propertyData.found,
      sampleProperty: propertyData.sampleProperty,
      fieldAnalysis: propertyData.fieldAnalysis,
      valuableFields: propertyData.fieldAnalysis?.valuableFields || []
    };

    // Create comprehensive prompt for AI analysis
    const prompt = `You are the Deal Maker AI, an expert real estate investment analyzer. Analyze this property data from BatchData API and provide a comprehensive investment assessment.

PROPERTY OVERVIEW:
- Address: ${analysisData.address}${analysisData.zipCode ? `, ${analysisData.zipCode}` : ''}
- Data Available: ${analysisData.propertyFound ? 'YES' : 'NO'}
- Total Fields Retrieved: ${analysisData.fieldAnalysis?.totalFields || 0}

KEY PROPERTY DATA:
${JSON.stringify(analysisData.valuableFields, null, 2)}

FULL PROPERTY DETAILS:
${JSON.stringify(analysisData.sampleProperty, null, 2)}

Please provide a detailed analysis covering:

1. **DEAL ASSESSMENT** (🎯 Deal Score: X/10)
   - Overall investment attractiveness
   - Key strengths and weaknesses
   - Risk factors

2. **FINANCIAL ANALYSIS** 💰
   - Current valuation vs market value
   - Price trends and appreciation potential
   - Rental income potential
   - ROI estimates

3. **PROPERTY INSIGHTS** 🏠
   - Property condition and features
   - Neighborhood quality indicators
   - Market positioning

4. **INVESTMENT STRATEGY** 📈
   - Best investment approach (flip, hold, rent, etc.)
   - Timeline recommendations
   - Exit strategies

5. **ACTION ITEMS** ✅
   - Next steps for evaluation
   - Additional data needed
   - Red flags to investigate

6. **MARKET CONTEXT** 📊
   - Local market trends
   - Comparable sales analysis
   - Demographic insights

Format your response in clear sections with emojis and actionable insights. Be specific about numbers when available and provide reasoning for your recommendations.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysis = response.content[0].type === 'text' ? response.content[0].text : 'Analysis failed';

    return NextResponse.json({
      success: true,
      analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'claude-3-5-sonnet-20241022',
        propertyAddress: analysisData.address,
        dataQuality: analysisData.fieldAnalysis?.totalFields > 50 ? 'High' : 
                    analysisData.fieldAnalysis?.totalFields > 20 ? 'Medium' : 'Low'
      }
    });

  } catch (error) {
    console.error('Deal Maker AI analysis error:', error);
    return NextResponse.json(
      { 
        error: 'AI analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}