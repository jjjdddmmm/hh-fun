// Inspection Analysis AI Prompts - Production-ready Claude prompts
// Zero tech debt implementation with comprehensive analysis instructions

import { InspectionReportType } from '@/lib/types/inspection';

export const INSPECTION_ANALYSIS_SYSTEM_PROMPT = `You are an expert home inspector and cost estimator with 20+ years of experience analyzing inspection reports for real estate negotiations. Your role is to:

1. **Extract and categorize issues** from inspection reports with precision
2. **Estimate realistic repair costs** based on current market rates
3. **Calculate negotiation values** that reflect actual leverage and market conditions
4. **Provide actionable recommendations** for buyers in negotiations

## Core Principles:
- **Accuracy over quantity** - Only identify clear, documented issues
- **Market-based costs** - Use realistic 2024 contractor rates and material costs
- **Negotiation reality** - Consider what sellers will actually agree to credit
- **Safety prioritization** - Always highlight immediate safety concerns
- **Regional awareness** - Adjust for local market conditions

## Analysis Standards:
- Be conservative with cost estimates unless issue severity is clearly documented
- Distinguish between "needs immediate attention" vs "monitor over time"
- Consider whether issues are typical for home age/type vs unusual problems
- Factor in whether repairs require permits, licensed professionals, or specialty work
- Account for market conditions affecting buyer leverage

You will receive inspection report text and return structured JSON analysis.`;

export const INSPECTION_ANALYSIS_USER_PROMPT = (
  reportText: string,
  reportType: InspectionReportType,
  propertyLocation?: string,
  homeAge?: number
) => `Analyze this ${reportType} inspection report and extract all significant issues that could impact a real estate negotiation.

## Report Text:
${reportText}

## Context:
- Report Type: ${reportType}
- Property Location: ${propertyLocation || 'Not specified'}
- Home Age: ${homeAge ? `${homeAge} years` : 'Not specified'}

## Required Analysis:

Please provide a comprehensive JSON response with this exact structure:

\`\`\`json
{
  "metadata": {
    "inspector": "string (if mentioned)",
    "inspectionDate": "string (if found)",
    "propertyAddress": "string (if found)",
    "wordCount": number,
    "qualityScore": number (0-100, how well you could analyze this report)
  },
  "issues": [
    {
      "id": "unique_id",
      "category": "ELECTRICAL|PLUMBING|HVAC|STRUCTURAL|ROOFING|etc",
      "severity": "safety|major|minor|cosmetic",
      "urgency": "immediate|1-6-months|6-24-months|2-5-years|monitoring",
      "riskLevel": "high|medium|low",
      "title": "Brief issue title",
      "description": "Detailed description from report",
      "location": "Specific location in property",
      "recommendations": ["array", "of", "recommended", "actions"],
      "estimatedCost": {
        "low": number,
        "high": number,
        "mostLikely": number,
        "laborHours": number (if applicable),
        "materialCost": number (if significant),
        "permitRequired": boolean,
        "professionalRequired": boolean
      },
      "negotiationValue": number,
      "safetyImplications": "string (if safety issue)",
      "pageReference": number (if you can determine),
      "sectionReference": "string (section title if identifiable)"
    }
  ],
  "summary": {
    "totalIssues": number,
    "safetyIssues": number,
    "majorIssues": number,
    "minorIssues": number,
    "cosmeticIssues": number,
    "totalEstimatedCost": {
      "minimum": number,
      "maximum": number,
      "mostLikely": number
    },
    "totalNegotiationValue": number,
    "recommendedNegotiationStrategy": {
      "recommendedAsk": number,
      "fallbackPosition": number,
      "walkAwayPoint": number,
      "keyTalkingPoints": ["array", "of", "talking", "points"],
      "marketContext": "string describing market context",
      "leverage": "high|moderate|low"
    }
  },
  "warnings": ["array", "of", "analysis", "warnings", "if", "any"]
}
\`\`\`

## Analysis Guidelines:

### Cost Estimation (2024 rates):
- **Electrical**: $100-150/hr, permits $200-500
- **Plumbing**: $85-125/hr, major repairs $500-5000+
- **HVAC**: $100-150/hr, system replacement $3000-8000+
- **Roofing**: $8-15/sq ft repair, $15000-25000+ replacement
- **Structural**: $150-200/hr, major work $5000-50000+

### Negotiation Value Calculation:
- **Safety issues**: 80-100% of estimated cost
- **Major functional**: 60-80% of estimated cost  
- **Minor functional**: 30-50% of estimated cost
- **Cosmetic**: 10-25% of estimated cost

### Severity Classification:
- **Safety**: Fire, electrical, structural, toxic hazards
- **Major**: System failures, water damage, significant functional issues
- **Minor**: Working but worn items, minor leaks, surface issues
- **Cosmetic**: Paint, fixtures, aesthetic items only

### Quality Score Factors:
- Report completeness and detail level
- Clear issue descriptions with locations
- Photo references or measurements
- Professional language and thoroughness
- Your confidence in extracting accurate information

Only include issues that are clearly documented in the report. Do not infer or assume issues that aren't explicitly mentioned.`;

export const COST_ESTIMATION_REFINEMENT_PROMPT = (
  issues: any[],
  location?: string,
  marketConditions?: string
) => `Refine the cost estimates for these inspection issues based on current market conditions:

## Issues to Refine:
${JSON.stringify(issues, null, 2)}

## Market Context:
- Location: ${location || 'General US market'}
- Market Conditions: ${marketConditions || 'Standard market'}

Please provide updated cost estimates considering:
1. **Current 2024 material costs** (inflation impact)
2. **Regional labor rates** for the specified location
3. **Supply chain factors** affecting material availability
4. **Seasonal pricing** if applicable
5. **Permit and inspection costs** for the location

Return the same JSON structure with updated \`estimatedCost\` and \`negotiationValue\` fields for each issue.`;

export const NEGOTIATION_STRATEGY_PROMPT = (
  totalEstimatedCost: number,
  issuesSummary: any,
  marketContext?: string
) => `Based on these inspection findings, provide a detailed negotiation strategy:

## Issue Summary:
${JSON.stringify(issuesSummary, null, 2)}

## Total Estimated Cost: $${totalEstimatedCost.toLocaleString()}

## Market Context: ${marketContext || 'Standard residential market'}

Provide a detailed negotiation strategy including:

1. **Opening Ask Amount** - Start high but realistic
2. **Target Settlement** - What you realistically expect to get
3. **Walk-Away Point** - Minimum acceptable credit
4. **Key Talking Points** - Specific arguments to use
5. **Leverage Assessment** - How strong is buyer's position
6. **Timing Strategy** - When to present these findings
7. **Alternative Solutions** - Besides cash credits

Consider:
- Seller motivation level
- Market competitiveness  
- Issue severity and urgency
- Typical seller response patterns
- Professional repair requirements

Return a comprehensive negotiation playbook as JSON.`;