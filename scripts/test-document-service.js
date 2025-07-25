import { logger } from "@/lib/utils/logger";

// Test DocumentVersionService directly
const { PrismaClient } = require('@prisma/client');
const { documentVersionService } = require('../lib/services/DocumentVersionService');

const prisma = new PrismaClient();

async function testDocumentService() {
  try {
    logger.debug('🧪 Testing DocumentVersionService...');
    
    // Get the step with documents
    const stepsWithDocs = await prisma.timelineDocument.groupBy({
      by: ['stepId'],
      where: {
        completionSessionId: { not: null }
      }
    });
    
    if (stepsWithDocs.length === 0) {
      logger.debug('❌ No steps with documents found');
      return;
    }
    
    const testStepId = stepsWithDocs[0].stepId;
    logger.debug(`📋 Testing with step: ${testStepId}`);
    
    // Test the service method
    const result = await documentVersionService.getDocumentsGroupedBySessions(testStepId);
    
    logger.debug('📄 Service result:', {
      currentCount: result.currentDocuments.length,
      previousSessionsCount: result.previousSessions.length,
      currentDocs: result.currentDocuments.map(d => ({
        id: d.id,
        name: d.originalName,
        version: d.documentVersion,
        isCurrentVersion: d.isCurrentVersion
      }))
    });
    
    if (result.currentDocuments.length === 0) {
      logger.debug('❌ No current documents returned - debugging...');
      
      // Check what's in the database directly
      const directQuery = await prisma.timelineDocument.findMany({
        where: { 
          stepId: testStepId 
        },
        select: {
          id: true,
          originalName: true,
          documentVersion: true,
          isCurrentVersion: true,
          completionSessionId: true,
          createdAt: true
        }
      });
      
      logger.debug('💾 Direct database query results:');
      directQuery.forEach((doc, i) => {
        logger.debug(`  ${i + 1}. ${doc.originalName} - v${doc.documentVersion} - current: ${doc.isCurrentVersion} - session: ${doc.completionSessionId}`);
      });
    }
    
  } catch (error) {
    logger.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentService();