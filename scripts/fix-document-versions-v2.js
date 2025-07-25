import { logger } from "@/lib/utils/logger";

// Fix Document Version Issues - Version 2
// This addresses the documentVersion and supersededBy fields
// Run with: node scripts/fix-document-versions-v2.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDocumentVersionsV2() {
  logger.debug('🔧 Starting document version cleanup v2...');
  
  try {
    // Step 1: Get all steps with completion sessions
    const stepsWithSessions = await prisma.timelineDocument.groupBy({
      by: ['stepId'],
      where: {
        completionSessionId: { not: null }
      }
    });

    for (const { stepId } of stepsWithSessions) {
      logger.debug(`\n📋 Processing step: ${stepId}`);
      
      // Get all completion sessions for this step, ordered by creation time
      const sessions = await prisma.timelineDocument.groupBy({
        by: ['completionSessionId'],
        where: {
          stepId,
          completionSessionId: { not: null }
        },
        _min: {
          createdAt: true
        },
        orderBy: {
          _min: {
            createdAt: 'asc'
          }
        }
      });

      logger.debug(`  📁 Found ${sessions.length} completion sessions`);

      // Process each session in chronological order
      for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
        const session = sessions[sessionIndex];
        const sessionId = session.completionSessionId;
        const versionNumber = sessionIndex + 1;
        const isLatestSession = sessionIndex === sessions.length - 1;

        logger.debug(`  🔄 Session ${sessionIndex + 1}: ${sessionId} (version ${versionNumber})`);

        // Get all documents in this session
        const sessionDocs = await prisma.timelineDocument.findMany({
          where: {
            stepId,
            completionSessionId: sessionId
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        logger.debug(`    📄 Processing ${sessionDocs.length} documents`);

        // Group documents by documentType to handle supersession properly
        const docsByType = {};
        sessionDocs.forEach(doc => {
          if (!docsByType[doc.documentType]) {
            docsByType[doc.documentType] = [];
          }
          docsByType[doc.documentType].push(doc);
        });

        // Process each document type
        for (const [docType, docs] of Object.entries(docsByType)) {
          // Keep only the first document of each type (delete duplicates)
          if (docs.length > 1) {
            const docsToDelete = docs.slice(1);
            logger.debug(`    🗑️ Deleting ${docsToDelete.length} duplicate ${docType} documents`);
            
            await prisma.timelineDocument.deleteMany({
              where: {
                id: { in: docsToDelete.map(d => d.id) }
              }
            });
          }

          const keepDoc = docs[0];

          // Find the previous version of this document type (from earlier sessions)
          let previousVersionDoc = null;
          if (sessionIndex > 0) {
            const previousSessions = sessions.slice(0, sessionIndex);
            
            for (let i = previousSessions.length - 1; i >= 0; i--) {
              const prevSessionId = previousSessions[i].completionSessionId;
              
              previousVersionDoc = await prisma.timelineDocument.findFirst({
                where: {
                  stepId,
                  completionSessionId: prevSessionId,
                  documentType: docType
                }
              });
              
              if (previousVersionDoc) break;
            }
          }

          // Update the current document
          logger.debug(`    ✏️ Updating ${docType} document to version ${versionNumber}`);
          
          await prisma.timelineDocument.update({
            where: { id: keepDoc.id },
            data: {
              documentVersion: versionNumber,
              isCurrentVersion: isLatestSession,
              supersededAt: isLatestSession ? null : new Date(),
              supersededBy: null // We'll set this when we process the next version
            }
          });

          // Update the previous version to point to this one
          if (previousVersionDoc) {
            logger.debug(`    🔗 Linking previous version (${previousVersionDoc.id}) to current (${keepDoc.id})`);
            
            await prisma.timelineDocument.update({
              where: { id: previousVersionDoc.id },
              data: {
                supersededBy: keepDoc.id,
                supersededAt: new Date(keepDoc.createdAt)
              }
            });
          }
        }
      }
    }

    // Final verification
    logger.debug('\n📊 Final verification:');
    
    const allDocs = await prisma.timelineDocument.findMany({
      where: {
        completionSessionId: { not: null }
      },
      select: {
        id: true,
        stepId: true,
        documentType: true,
        documentVersion: true,
        isCurrentVersion: true,
        supersededBy: true,
        completionSessionId: true
      },
      orderBy: [
        { stepId: 'asc' },
        { documentVersion: 'asc' }
      ]
    });

    const stepSummary = {};
    allDocs.forEach(doc => {
      if (!stepSummary[doc.stepId]) {
        stepSummary[doc.stepId] = { total: 0, current: 0, versions: new Set() };
      }
      stepSummary[doc.stepId].total++;
      if (doc.isCurrentVersion) stepSummary[doc.stepId].current++;
      stepSummary[doc.stepId].versions.add(doc.documentVersion);
    });

    Object.entries(stepSummary).forEach(([stepId, summary]) => {
      logger.debug(`  Step ${stepId}: ${summary.total} total docs, ${summary.current} current, versions: [${Array.from(summary.versions).sort().join(', ')}]`);
    });

    // Check for proper supersession chains
    const supersessionCheck = await prisma.timelineDocument.findMany({
      where: {
        completionSessionId: { not: null },
        isCurrentVersion: false
      },
      select: {
        id: true,
        documentVersion: true,
        supersededBy: true
      }
    });

    const withoutSupersession = supersessionCheck.filter(doc => !doc.supersededBy);
    if (withoutSupersession.length > 0) {
      logger.debug(`⚠️ Found ${withoutSupersession.length} old versions without supersededBy links`);
    } else {
      logger.debug(`✅ All old versions properly linked to their replacements`);
    }

    logger.debug('\n✅ Document version cleanup v2 completed!');
    
  } catch (error) {
    logger.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDocumentVersionsV2();