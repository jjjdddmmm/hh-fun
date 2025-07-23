// Debug document loading issue
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDocuments() {
  try {
    console.log('🔍 Debugging document loading issue...');
    
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
    
    console.log(`📄 Found ${allDocs.length} total documents`);
    
    // Group by step
    const byStep = {};
    allDocs.forEach(doc => {
      if (!byStep[doc.stepId]) byStep[doc.stepId] = [];
      byStep[doc.stepId].push(doc);
    });
    
    Object.entries(byStep).forEach(([stepId, docs]) => {
      const current = docs.filter(d => d.isCurrentVersion);
      console.log(`\n  Step ${stepId}:`);
      console.log(`    Total: ${docs.length} docs`);
      console.log(`    Current: ${current.length} docs`);
      
      if (current.length > 0) {
        current.forEach(doc => {
          console.log(`      - ${doc.originalName} (v${doc.documentVersion}, session: ${doc.completionSessionId})`);
        });
      }
    });
    
    // Test the DocumentVersionService method directly
    console.log('\n🧪 Testing DocumentVersionService...');
    const { documentVersionService } = require('../lib/services/DocumentVersionService');
    
    // Get first step with documents
    const firstStepWithDocs = Object.keys(byStep)[0];
    if (firstStepWithDocs) {
      console.log(`\n🔬 Testing with step: ${firstStepWithDocs}`);
      const result = await documentVersionService.getDocumentsGroupedBySessions(firstStepWithDocs);
      console.log('Service result:', {
        currentCount: result.currentDocuments.length,
        previousSessionsCount: result.previousSessions.length
      });
      
      if (result.currentDocuments.length > 0) {
        console.log('Current documents:');
        result.currentDocuments.forEach(doc => {
          console.log(`  - ${doc.originalName} (v${doc.documentVersion})`);
        });
      } else {
        console.log('❌ No current documents returned by service');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDocuments();