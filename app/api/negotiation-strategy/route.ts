import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createAIAnalyzer } from "@/lib/ai-analysis";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, negotiationParams } = await request.json();

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

    // Create detailed negotiation strategy
    const aiAnalyzer = createAIAnalyzer();
    const negotiationAnalysis = await aiAnalyzer.analyzeNegotiation(
      property, 
      negotiationParams
    );

    // Save analysis to database
    await prisma.propertyAnalysis.create({
      data: {
        propertyId,
        analysisType: "negotiation",
        aiModel: "claude-3-5-sonnet-20241022",
        analysis: JSON.stringify(negotiationAnalysis),
        confidence: negotiationAnalysis.confidence / 100
      }
    });

    return NextResponse.json({
      success: true,
      data: negotiationAnalysis
    });
  } catch (error) {
    console.error("Error analyzing negotiation strategy:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}