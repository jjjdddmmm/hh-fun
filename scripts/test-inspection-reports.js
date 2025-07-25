import { logger } from "@/lib/utils/logger";

// Test what inspection reports are available in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInspectionReports() {
  try {
    logger.debug('🔍 Testing inspection reports query...');
    
    // Check all timeline documents
    const allDocs = await prisma.timelineDocument.findMany({
      include: {
        step: {
          select: {
            title: true,
            category: true,
            isCompleted: true
          }
        },
        timeline: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });
    
    logger.debug(`📄 Total documents in database: ${allDocs.length}`);
    
    // Filter for inspection documents
    const inspectionDocs = allDocs.filter(doc => 
      doc.step?.category === 'INSPECTION' && 
      doc.step?.isCompleted === true &&
      doc.isCurrentVersion === true
    );
    
    logger.debug(`🔍 Inspection documents (completed, current): ${inspectionDocs.length}`);
    
    if (inspectionDocs.length > 0) {
      logger.debug('\n📋 Available inspection reports:');
      inspectionDocs.forEach((doc, i) => {
        logger.debug(`  ${i + 1}. ${doc.originalName}`);
        logger.debug(`     Step: ${doc.step?.title}`);
        logger.debug(`     User: ${doc.timeline.userId}`);
        logger.debug(`     Size: ${doc.fileSize} bytes`);
        logger.debug(`     Created: ${doc.createdAt}`);
        logger.debug('');
      });
    } else {
      logger.debug('\n❌ No inspection reports found. To test:');
      logger.debug('1. Complete some inspection steps in timeline');
      logger.debug('2. Upload documents to those steps');
      logger.debug('3. Make sure steps are marked as completed');
    }
    
    // Show breakdown by step category
    const categoryBreakdown = {};
    allDocs.forEach(doc => {
      const category = doc.step?.category || 'NO_STEP';
      if (!categoryBreakdown[category]) categoryBreakdown[category] = 0;
      categoryBreakdown[category]++;
    });
    
    logger.debug('\n📊 Documents by step category:');
    Object.entries(categoryBreakdown).forEach(([category, count]) => {
      logger.debug(`  ${category}: ${count}`);
    });
    
  } catch (error) {
    logger.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInspectionReports();