// Fix Document Version Numbers - Quick Fix
// This specifically addresses the documentVersion field being all 1s

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixVersionNumbers() {
  console.log('🔧 Fixing document version numbers...');
  
  try {
    // Get all steps with documents
    const steps = await prisma.timelineDocument.groupBy({
      by: ['stepId'],
      where: {
        completionSessionId: { not: null }
      }
    });

    for (const { stepId } of steps) {
      console.log(`\n📋 Processing step: ${stepId}`);
      
      // Get all unique sessions for this step, ordered by creation time
      const sessions = await prisma.timelineDocument.findMany({
        where: {
          stepId,
          completionSessionId: { not: null }
        },
        select: {
          completionSessionId: true,
          createdAt: true
        },
        distinct: ['completionSessionId'],
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log(`  📁 Found ${sessions.length} sessions`);

      // Assign proper version numbers based on session chronology
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        const versionNumber = i + 1;
        
        console.log(`  🔄 Setting session ${session.completionSessionId} to version ${versionNumber}`);
        
        await prisma.timelineDocument.updateMany({
          where: {
            stepId,
            completionSessionId: session.completionSessionId
          },
          data: {
            documentVersion: versionNumber
          }
        });
      }

      // Now set up proper supersession chains
      if (sessions.length > 1) {
        // Get documents by type for proper supersession
        const docTypes = await prisma.timelineDocument.groupBy({
          by: ['documentType'],
          where: {
            stepId,
            completionSessionId: { not: null }
          }
        });

        for (const { documentType } of docTypes) {
          // Get all versions of this document type, ordered by version
          const versions = await prisma.timelineDocument.findMany({
            where: {
              stepId,
              documentType,
              completionSessionId: { not: null }
            },
            orderBy: [
              { documentVersion: 'asc' },
              { createdAt: 'asc' }
            ]
          });

          // Link each version to the next one
          for (let i = 0; i < versions.length - 1; i++) {
            const currentVersion = versions[i];
            const nextVersion = versions[i + 1];

            console.log(`    🔗 Linking ${documentType} v${currentVersion.documentVersion} → v${nextVersion.documentVersion}`);

            await prisma.timelineDocument.update({
              where: { id: currentVersion.id },
              data: {
                supersededBy: nextVersion.id,
                supersededAt: nextVersion.createdAt
              }
            });
          }
        }
      }
    }

    // Final verification
    console.log('\n📊 Final verification:');
    const allDocs = await prisma.timelineDocument.findMany({
      where: {
        completionSessionId: { not: null }
      },
      select: {
        stepId: true,
        documentVersion: true,
        isCurrentVersion: true,
        supersededBy: true
      },
      orderBy: [
        { stepId: 'asc' },
        { documentVersion: 'asc' }
      ]
    });

    const summary = {};
    allDocs.forEach(doc => {
      if (!summary[doc.stepId]) {
        summary[doc.stepId] = { versions: new Set(), current: 0, total: 0, linked: 0 };
      }
      summary[doc.stepId].versions.add(doc.documentVersion);
      summary[doc.stepId].total++;
      if (doc.isCurrentVersion) summary[doc.stepId].current++;
      if (doc.supersededBy) summary[doc.stepId].linked++;
    });

    Object.entries(summary).forEach(([stepId, data]) => {
      const versions = Array.from(data.versions).sort((a, b) => a - b);
      console.log(`  Step ${stepId}: versions [${versions.join(', ')}], ${data.current}/${data.total} current, ${data.linked} linked`);
    });

    console.log('\n✅ Version number fix completed!');
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixVersionNumbers();