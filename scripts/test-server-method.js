import { logger } from "@/lib/utils/logger";

// Test the server method directly
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the compiled version after running tsc
async function testServerMethod() {
  try {
    logger.debug('🧪 Testing server method directly...');
    
    const stepId = 'cmdff53p1000b8cet07p3qak4';
    logger.debug('📋 Testing with stepId:', stepId);
    
    // Test the basic queries that the server method uses
    logger.debug('\n1️⃣ Testing allDocuments query...');
    const allDocuments = await prisma.timelineDocument.findMany({
      where: { stepId },
      orderBy: [
        { isCurrentVersion: 'desc' },
        { documentVersion: 'desc' },  
        { createdAt: 'desc' }
      ]
    });
    
    logger.debug(`📄 Found ${allDocuments.length} total documents`);
    
    const currentDocuments = allDocuments.filter(doc => doc.isCurrentVersion);
    const previousDocuments = allDocuments.filter(doc => !doc.isCurrentVersion);
    
    logger.debug(`📊 Current: ${currentDocuments.length}, Previous: ${previousDocuments.length}`);
    
    logger.debug('\n2️⃣ Testing completion sessions query...');
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
    
    logger.debug(`📁 Found ${sessions.length} sessions`);
    
    const formattedSessions = sessions
      .filter(session => session.completionSessionId)
      .map((session, index) => ({
        id: session.completionSessionId,
        stepId,
        sessionNumber: index + 1,
        createdAt: session.createdAt,
        documentCount: session._count.id
      }));
    
    logger.debug('✅ Formatted sessions:', formattedSessions.length);
    
    // Test the final result construction
    const totalSessions = formattedSessions.length;
    
    const currentWithSessionInfo = currentDocuments.map(doc => ({
      ...doc,
      sessionInfo: {
        sessionNumber: totalSessions,
        totalSessions,
        isLatestSession: true
      }
    }));
    
    const previousSessions = formattedSessions.slice(0, -1).map(session => {
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
    
    const result = {
      currentDocuments: currentWithSessionInfo,
      previousSessions
    };
    
    logger.debug('\n✅ Final result:', {
      currentCount: result.currentDocuments.length,
      previousSessionsCount: result.previousSessions.length
    });
    
    if (result.currentDocuments.length > 0) {
      logger.debug('\n📄 Current documents:');
      result.currentDocuments.forEach((doc, i) => {
        logger.debug(`  ${i + 1}. ${doc.originalName} (v${doc.documentVersion})`);
      });
    }
    
  } catch (error) {
    logger.error('❌ Error in server method test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testServerMethod();