import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createAIAnalyzer } from "@/lib/ai-analysis";
import { createZillowAPI } from "@/lib/zillow-api";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, investmentParams } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
    }

    // Get the property with existing analysis
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { 
        user: true,
        analyses: {
          where: { analysisType: "comprehensive" },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!property || property.user.clerkId !== userId) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    // Create detailed investment analysis
    const aiAnalyzer = createAIAnalyzer();
    const investmentAnalysis = await aiAnalyzer.analyzeInvestment(
      property, 
      investmentParams
    );

    // Save analysis to database
    await prisma.propertyAnalysis.create({
      data: {
        propertyId,
        analysisType: "investment",
        aiModel: "claude-3-5-sonnet-20241022",
        analysis: JSON.stringify(investmentAnalysis),
        confidence: investmentAnalysis.confidence / 100
      }
    });

    return NextResponse.json({
      success: true,
      data: investmentAnalysis
    });
  } catch (error) {
    console.error("Error analyzing investment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}