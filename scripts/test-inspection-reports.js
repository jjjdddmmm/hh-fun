// Test what inspection reports are available in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInspectionReports() {
  try {
    console.log('🔍 Testing inspection reports query...');
    
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
    
    console.log(`📄 Total documents in database: ${allDocs.length}`);
    
    // Filter for inspection documents
    const inspectionDocs = allDocs.filter(doc => 
      doc.step?.category === 'INSPECTION' && 
      doc.step?.isCompleted === true &&
      doc.isCurrentVersion === true
    );
    
    console.log(`🔍 Inspection documents (completed, current): ${inspectionDocs.length}`);
    
    if (inspectionDocs.length > 0) {
      console.log('\n📋 Available inspection reports:');
      inspectionDocs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.originalName}`);
        console.log(`     Step: ${doc.step?.title}`);
        console.log(`     User: ${doc.timeline.userId}`);
        console.log(`     Size: ${doc.fileSize} bytes`);
        console.log(`     Created: ${doc.createdAt}`);
        console.log('');
      });
    } else {
      console.log('\n❌ No inspection reports found. To test:');
      console.log('1. Complete some inspection steps in timeline');
      console.log('2. Upload documents to those steps');
      console.log('3. Make sure steps are marked as completed');
    }
    
    // Show breakdown by step category
    const categoryBreakdown = {};
    allDocs.forEach(doc => {
      const category = doc.step?.category || 'NO_STEP';
      if (!categoryBreakdown[category]) categoryBreakdown[category] = 0;
      categoryBreakdown[category]++;
    });
    
    console.log('\n📊 Documents by step category:');
    Object.entries(categoryBreakdown).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInspectionReports();