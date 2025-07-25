import { logger } from "@/lib/utils/logger";

// Debug document loading issue
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDocuments() {
  try {
    logger.debug('🔍 Debugging document loading issue...');
    
    // Get all timeline documents to understand current state
    const allDocs = await prisma.timelineDocument.findMany({
      select: {
        id: true,
        stepId: true,
        originalName: true,
        documentType: true,
        documentVersion: true,
        isCurrentVersion: true,
        completionSessionId: true,
        createdAt: true
      },
      orderBy: [
        { stepId: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    logger.debug(`📄 Found ${allDocs.length} total documents`);
    
    // Group by step
    const byStep = {};
    allDocs.forEach(doc => {
      if (!byStep[doc.stepId]) byStep[doc.stepId] = [];
      byStep[doc.stepId].push(doc);
    });
    
    Object.entries(byStep).forEach(([stepId, docs]) => {
      const current = docs.filter(d => d.isCurrentVersion);
      logger.debug(`\n  Step ${stepId}:`);
      logger.debug(`    Total: ${docs.length} docs`);
      logger.debug(`    Current: ${current.length} docs`);
      
      if (current.length > 0) {
        current.forEach(doc => {
          logger.debug(`      - ${doc.originalName} (v${doc.documentVersion}, session: ${doc.completionSessionId})`);
        });
      }
    });
    
    // Test the DocumentVersionService method directly
    logger.debug('\n🧪 Testing DocumentVersionService...');
    const { documentVersionService } = require('../lib/services/DocumentVersionService');
    
    // Get first step with documents
    const firstStepWithDocs = Object.keys(byStep)[0];
    if (firstStepWithDocs) {
      logger.debug(`\n🔬 Testing with step: ${firstStepWithDocs}`);
      const result = await documentVersionService.getDocumentsGroupedBySessions(firstStepWithDocs);
      logger.debug('Service result:', {
        currentCount: result.currentDocuments.length,
        previousSessionsCount: result.previousSessions.length
      });
      
      if (result.currentDocuments.length > 0) {
        logger.debug('Current documents:');
        result.currentDocuments.forEach(doc => {
          logger.debug(`  - ${doc.originalName} (v${doc.documentVersion})`);
        });
      } else {
        logger.debug('❌ No current documents returned by service');
      }
    }
    
  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDocuments();