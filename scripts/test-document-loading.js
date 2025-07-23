// Test document loading issue
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDocumentLoading() {
  try {
    console.log('🔍 Testing document loading...');
    
    // Get the step with documents
    const stepsWithDocs = await prisma.timelineDocument.groupBy({
      by: ['stepId'],
      where: {
        completionSessionId: { not: null }
      }
    });
    
    if (stepsWithDocs.length === 0) {
      console.log('❌ No steps with documents found');
      return;
    }
    
    const testStepId = stepsWithDocs[0].stepId;
    console.log(`📋 Testing with step: ${testStepId}`);
    
    // Test the exact query from DocumentVersionService
    console.log('\n🧪 Testing allDocuments query...');
    const allDocuments = await prisma.timelineDocument.findMany({
      where: { stepId: testStepId },
      orderBy: [
        { isCurrentVersion: 'desc' },
        { documentVersion: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    console.log(`📄 Found ${allDocuments.length} documents`);
    
    // Separate current vs previous versions (like in the service)
    const currentDocuments = allDocuments.filter(doc => doc.isCurrentVersion);
    const previousDocuments = allDocuments.filter(doc => !doc.isCurrentVersion);
    
    console.log(`📊 Current: ${currentDocuments.length}, Previous: ${previousDocuments.length}`);
    
    if (currentDocuments.length > 0) {
      console.log('\n✅ Current documents:');
      currentDocuments.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.originalName} - v${doc.documentVersion} - session: ${doc.completionSessionId}`);
      });
    } else {
      console.log('\n❌ No current documents found');
    }
    
    // Test getCompletionSessions logic
    console.log('\n🧪 Testing completion sessions query...');
    const sessions = await prisma.timelineDocument.groupBy({
      by: ['completionSessionId', 'createdAt'],
      where: {
        stepId: testStepId,
        completionSessionId: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📁 Found ${sessions.length} sessions`);
    sessions.forEach((session, i) => {
      console.log(`  ${i + 1}. ${session.completionSessionId} - ${session._count.id} docs - ${session.createdAt}`);
    });
    
    // Now let's simulate the service method logic
    console.log('\n🧪 Simulating service method...');
    
    const totalSessions = sessions.length;
    
    // Add session info to current documents (like in service)
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
        .filter(doc => doc.completionSessionId === session.completionSessionId)
        .map(doc => ({
          ...doc,
          sessionInfo: {
            sessionNumber: sessions.findIndex(s => s.completionSessionId === session.completionSessionId) + 1,
            totalSessions,
            isLatestSession: false
          }
        }));

      return {
        session: {
          id: session.completionSessionId,
          stepId: testStepId,
          sessionNumber: sessions.findIndex(s => s.completionSessionId === session.completionSessionId) + 1,
          createdAt: session.createdAt,
          documentCount: session._count.id
        },
        documents: sessionDocs
      };
    });
    
    const result = {
      currentDocuments: currentWithSessionInfo,
      previousSessions
    };
    
    console.log('\n📊 Final result:', {
      currentCount: result.currentDocuments.length,
      previousSessionsCount: result.previousSessions.length
    });
    
    if (result.currentDocuments.length === 0) {
      console.log('\n❌ Service would return no current documents!');
      console.log('🔧 This explains why the modal shows "No documents yet"');
    } else {
      console.log('\n✅ Service would return current documents correctly');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentLoading();