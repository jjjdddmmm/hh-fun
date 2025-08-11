import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user by Clerk ID to get internal user ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all current version inspection documents from user's timelines
    // Focus on INSPECTION category steps that are completed
    const inspectionDocuments = await prisma.timelineDocument.findMany({
      where: {
        isCurrentVersion: true,
        timeline: {
          userId: user.id
        },
        step: {
          category: 'INSPECTION',
          isCompleted: true
        }
      },
      include: {
        step: {
          select: {
            title: true,
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the documents into the format expected by the negotiation tool
    const formattedReports = inspectionDocuments.map(doc => ({
      id: doc.id,
      originalName: doc.originalName,
      downloadUrl: doc.downloadUrl,
      documentType: doc.documentType,
      fileSize: Number(doc.fileSize), // Convert BigInt to number
      createdAt: doc.createdAt.toISOString(),
      stepTitle: doc.step?.title || 'Unknown Step',
      stepCategory: doc.step?.category || 'INSPECTION'
    }));

    return NextResponse.json(formattedReports);

  } catch (error) {
    logger.error('Error fetching inspection reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection reports' },
      { status: 500 }
    );
  }
}