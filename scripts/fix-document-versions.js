import { logger } from "@/lib/utils/logger";

// Fix Document Version Issues
// Run with: node scripts/fix-document-versions.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDocumentVersions() {
  logger.debug('🔧 Starting document version cleanup...');
  
  try {
    // Step 1: Get all steps with documents
    const stepsWithDocs = await prisma.timelineDocument.findMany({
      where: {
        completionSessionId: { not: null }
      },
      select: {
        stepId: true,
        completionSessionId: true,
        createdAt: true,
        id: true,
        documentType: true
      },
      orderBy: [
        { stepId: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Group by stepId
    const stepGroups = {};
    stepsWithDocs.forEach(doc => {
      if (!stepGroups[doc.stepId]) {
        stepGroups[doc.stepId] = [];
      }
      stepGroups[doc.stepId].push(doc);
    });

    for (const [stepId, docs] of Object.entries(stepGroups)) {
      logger.debug(`📋 Processing step ${stepId} with ${docs.length} documents`);
      
      // Group by completion session
      const sessionGroups = {};
      docs.forEach(doc => {
        if (!sessionGroups[doc.completionSessionId]) {
          sessionGroups[doc.completionSessionId] = [];
        }
        sessionGroups[doc.completionSessionId].push(doc);
      });

      // Sort sessions by creation time
      const sessions = Object.entries(sessionGroups).sort(([,a], [,b]) => {
        return new Date(a[0].createdAt) - new Date(b[0].createdAt);
      });

      logger.debug(`  📁 Found ${sessions.length} completion sessions`);

      // Process each session
      for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
        const [sessionId, sessionDocs] = sessions[sessionIndex];
        const isLatestSession = sessionIndex === sessions.length - 1;
        const versionNumber = sessionIndex + 1;

        logger.debug(`  🔄 Session ${sessionIndex + 1}: ${sessionDocs.length} docs, latest: ${isLatestSession}`);

        // Remove duplicates within the same session (keep first of each document type)
        const docTypesSeen = new Set();
        const docsToKeep = [];
        const docsToDelete = [];

        sessionDocs.forEach(doc => {
          if (docTypesSeen.has(doc.documentType)) {
            docsToDelete.push(doc.id);
          } else {
            docTypesSeen.add(doc.documentType);
            docsToKeep.push(doc);
          }
        });

        // Delete duplicate documents
        if (docsToDelete.length > 0) {
          logger.debug(`    🗑️ Deleting ${docsToDelete.length} duplicate documents`);
          await prisma.timelineDocument.deleteMany({
            where: {
              id: { in: docsToDelete }
            }
          });
        }

        // Update remaining documents
        if (docsToKeep.length > 0) {
          logger.debug(`    ✅ Updating ${docsToKeep.length} documents to version ${versionNumber}`);
          await prisma.timelineDocument.updateMany({
            where: {
              id: { in: docsToKeep.map(d => d.id) }
            },
            data: {
              documentVersion: versionNumber,
              isCurrentVersion: isLatestSession,
              supersededAt: isLatestSession ? null : new Date(),
              supersededBy: null // Reset this for simplicity
            }
          });
        }
      }
    }

    // Final verification
    const verification = await prisma.timelineDocument.groupBy({
      by: ['stepId', 'isCurrentVersion'],
      _count: {
        id: true
      },
      where: {
        completionSessionId: { not: null }
      }
    });

    logger.debug('\n📊 Final verification:');
    verification.forEach(group => {
      logger.debug(`  Step ${group.stepId}: ${group._count.id} documents (current: ${group.isCurrentVersion})`);
    });

    logger.debug('\n✅ Document version cleanup completed!');
    
  } catch (error) {
    logger.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDocumentVersions();