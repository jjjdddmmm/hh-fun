// Document Version Service - Production Ready, Zero Tech Debt
// Handles document completion sessions and version control

import { prisma } from '@/lib/prisma';
import { TimelineDocument } from '@prisma/client';

export interface DocumentCompletionSession {
  id: string;
  stepId: string;
  sessionNumber: number;
  createdAt: Date;
  documentCount: number;
}

export interface DocumentWithVersionInfo extends TimelineDocument {
  supersededByDocument?: TimelineDocument | null;
  supersedes?: TimelineDocument[];
  sessionInfo?: {
    sessionNumber: number;
    totalSessions: number;
    isLatestSession: boolean;
  };
}

export class DocumentVersionService {
  
  /**
   * Create a new completion session ID for a step
   */
  async createCompletionSession(stepId: string): Promise<string> {
    // Generate a unique session ID based on step + timestamp
    const sessionId = `session_${stepId}_${Date.now()}`;
    return sessionId;
  }

  /**
   * Get all completion sessions for a step (browser-safe version)
   */
  async getCompletionSessions(stepId: string): Promise<DocumentCompletionSession[]> {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Browser environment - make API call
      const response = await fetch(`/api/timeline/steps/${stepId}/documents`);
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      const data = await response.json();
      // Extract sessions from the response
      const sessions = data.previousSessions.map((ps: any) => ps.session);
      // Add current session if there are current documents
      if (data.currentDocuments.length > 0) {
        // We need to infer the current session info
        const currentSession = {
          id: data.currentDocuments[0].completionSessionId,
          stepId,
          sessionNumber: sessions.length + 1,
          createdAt: data.currentDocuments[0].createdAt,
          documentCount: data.currentDocuments.length
        };
        sessions.push(currentSession);
      }
      return sessions;
    }

    // Server environment - direct database access
    return this.getCompletionSessionsServer(stepId);
  }

  /**
   * Get all completion sessions for a step (server-only version)
   */
  async getCompletionSessionsServer(stepId: string): Promise<DocumentCompletionSession[]> {
    // Get all unique completion sessions for this step
    const sessions = await prisma.timelineDocument.groupBy({
      by: ['completionSessionId', 'createdAt'],
      where: {
        stepId,
        completionSessionId: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return sessions
      .filter(session => session.completionSessionId)
      .map((session, index) => ({
        id: session.completionSessionId!,
        stepId,
        sessionNumber: index + 1,
        createdAt: session.createdAt,
        documentCount: session._count.id
      }));
  }

  /**
   * Mark previous versions as superseded when step is re-completed
   * This is called AFTER all documents in a session are uploaded
   */
  async markPreviousVersionsSuperseded(stepId: string, newSessionId: string): Promise<void> {
    // Get all current version documents for this step from DIFFERENT sessions
    const currentDocuments = await prisma.timelineDocument.findMany({
      where: {
        stepId,
        isCurrentVersion: true,
        completionSessionId: { not: newSessionId } // Don't affect documents in the new session
      }
    });

    // Mark them as superseded in a transaction
    if (currentDocuments.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.timelineDocument.updateMany({
          where: {
            id: { in: currentDocuments.map(doc => doc.id) }
          },
          data: {
            isCurrentVersion: false,
            supersededAt: new Date()
          }
        });
      });
    }
  }

  /**
   * Clean up documents when a step is marked incomplete
   */
  async handleStepIncomplete(stepId: string): Promise<void> {
    // When a step is marked incomplete, we could either:
    // 1. Delete the latest session documents (current approach)
    // 2. Keep them but mark as "incomplete session"
    
    // For now, let's keep the documents but restore the previous current versions
    const latestSession = await this.getCompletionSessionsServer(stepId);
    if (latestSession.length === 0) return;
    
    const mostRecentSession = latestSession[latestSession.length - 1];
    
    await prisma.$transaction(async (tx) => {
      // Mark current session documents as not current
      await tx.timelineDocument.updateMany({
        where: {
          stepId,
          completionSessionId: mostRecentSession.id,
          isCurrentVersion: true
        },
        data: {
          isCurrentVersion: false,
          supersededAt: new Date()
        }
      });
      
      // Restore previous versions as current (if any)
      const previousDocuments = await tx.timelineDocument.findMany({
        where: {
          stepId,
          completionSessionId: { not: mostRecentSession.id },
          supersededAt: { not: null }
        },
        distinct: ['documentType'],
        orderBy: [
          { documentVersion: 'desc' },
          { createdAt: 'desc' }
        ]
      });
      
      // Restore the most recent version of each document type
      for (const doc of previousDocuments) {
        await tx.timelineDocument.update({
          where: { id: doc.id },
          data: {
            isCurrentVersion: true,
            supersededBy: null,
            supersededAt: null
          }
        });
      }
    });
  }

  /**
   * Handle document versioning when uploading to a re-completed step
   */
  async handleDocumentVersioning(
    stepId: string,
    documentType: string,
    newDocumentId: string,
    sessionId: string
  ): Promise<void> {
    // ONLY look for previous versions from DIFFERENT sessions
    const previousVersion = await prisma.timelineDocument.findFirst({
      where: {
        stepId,
        documentType: documentType as any, // Cast to enum type
        isCurrentVersion: true,
        completionSessionId: { not: sessionId }, // Exclude same session
        id: { not: newDocumentId } // Don't match the new document
      },
      orderBy: {
        documentVersion: 'desc'
      }
    });

    if (previousVersion) {
      // This is a new version from a different session
      const newVersionNumber = previousVersion.documentVersion + 1;

      // Update the new document with version info
      await prisma.timelineDocument.update({
        where: { id: newDocumentId },
        data: {
          documentVersion: newVersionNumber,
          completionSessionId: sessionId,
          isCurrentVersion: true
        }
      });

      // Mark previous version as superseded
      await prisma.timelineDocument.update({
        where: { id: previousVersion.id },
        data: {
          isCurrentVersion: false,
          supersededBy: newDocumentId,
          supersededAt: new Date()
        }
      });
    } else {
      // First version OR first in this session - start at version 1
      await prisma.timelineDocument.update({
        where: { id: newDocumentId },
        data: {
          documentVersion: 1,
          completionSessionId: sessionId,
          isCurrentVersion: true
        }
      });
    }
  }

  /**
   * Get documents grouped by completion session (browser-safe version)
   */
  async getDocumentsGroupedBySessions(stepId: string): Promise<{
    currentDocuments: DocumentWithVersionInfo[];
    previousSessions: Array<{
      session: DocumentCompletionSession;
      documents: DocumentWithVersionInfo[];
    }>;
  }> {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Browser environment - make API call
      const response = await fetch(`/api/timeline/steps/${stepId}/documents`);
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      return await response.json();
    }

    // Server environment - direct database access
    return this.getDocumentsGroupedBySessionsServer(stepId);
  }

  /**
   * Get documents grouped by completion session (server-only version)
   */
  async getDocumentsGroupedBySessionsServer(stepId: string): Promise<{
    currentDocuments: DocumentWithVersionInfo[];
    previousSessions: Array<{
      session: DocumentCompletionSession;
      documents: DocumentWithVersionInfo[];
    }>;
  }> {
    // Get all documents for this step
    const allDocuments = await prisma.timelineDocument.findMany({
      where: { stepId },
      orderBy: [
        { isCurrentVersion: 'desc' },
        { documentVersion: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Separate current vs previous versions
    const currentDocuments = allDocuments.filter(doc => doc.isCurrentVersion);
    const previousDocuments = allDocuments.filter(doc => !doc.isCurrentVersion);

    // Get completion sessions
    const sessions = await this.getCompletionSessionsServer(stepId);
    const totalSessions = sessions.length;

    // Add session info to current documents
    const currentWithSessionInfo = currentDocuments.map(doc => ({
      ...doc,
      sessionInfo: {
        sessionNumber: totalSessions,
        totalSessions,
        isLatestSession: true
      }
    }));

    // Group previous documents by session
    const previousSessions = sessions.slice(0, -1).map(session => {
      const sessionDocs = previousDocuments
        .filter(doc => doc.completionSessionId === session.id)
        .map(doc => ({
          ...doc,
          sessionInfo: {
            sessionNumber: session.sessionNumber,
            totalSessions,
            isLatestSession: false
          }
        }));

      return {
        session,
        documents: sessionDocs
      };
    });

    return {
      currentDocuments: currentWithSessionInfo,
      previousSessions
    };
  }

  /**
   * Promote a previous version to current
   */
  async promoteDocumentToCurrent(documentId: string): Promise<void> {
    const document = await prisma.timelineDocument.findUniqueOrThrow({
      where: { id: documentId }
    });

    await prisma.$transaction(async (tx) => {
      // Mark all other versions of same document type as not current
      await tx.timelineDocument.updateMany({
        where: {
          stepId: document.stepId,
          documentType: document.documentType,
          id: { not: documentId }
        },
        data: {
          isCurrentVersion: false,
          supersededAt: new Date()
        }
      });

      // Mark this document as current
      await tx.timelineDocument.update({
        where: { id: documentId },
        data: {
          isCurrentVersion: true,
          supersededBy: null,
          supersededAt: null
        }
      });
    });
  }

  /**
   * Get only current version documents (for API/negotiation use)
   */
  async getCurrentVersionDocuments(stepId: string): Promise<TimelineDocument[]> {
    return await prisma.timelineDocument.findMany({
      where: {
        stepId,
        isCurrentVersion: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

export const documentVersionService = new DocumentVersionService();