import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";
import { auth } from '@clerk/nextjs/server';
import { documentVersionService } from '@/lib/services/DocumentVersionService';

export async function GET(
  request: NextRequest,
  { params }: { params: { stepId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stepId = params.stepId;
    if (!stepId) {
      return NextResponse.json({ error: 'Step ID is required' }, { status: 400 });
    }

    // Get documents grouped by sessions (server version)
    const documentVersions = await documentVersionService.getDocumentsGroupedBySessionsServer(stepId);

    // Convert BigInt values to numbers for JSON serialization
    const serializedResult = {
      currentDocuments: documentVersions.currentDocuments.map(doc => ({
        ...doc,
        fileSize: doc.fileSize ? Number(doc.fileSize) : 0
      })),
      previousSessions: documentVersions.previousSessions.map(session => ({
        ...session,
        documents: session.documents.map(doc => ({
          ...doc,
          fileSize: doc.fileSize ? Number(doc.fileSize) : 0
        }))
      }))
    };

    return NextResponse.json(serializedResult);

  } catch (error) {
    logger.error('Error loading step documents:', error);
    return NextResponse.json(
      { error: 'Failed to load step documents' },
      { status: 500 }
    );
  }
}