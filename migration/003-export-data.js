#!/usr/bin/env node
// Export data from Neon in the correct order (respecting foreign keys)

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Helper function to convert BigInt to string
function serializeBigInts(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

async function exportData() {
  console.log('📤 Exporting data from Neon...\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_HqGpfYzj8Ds5@ep-autumn-rain-adxtmygh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
      }
    }
  });

  const exportDir = 'migration/data-export';
  
  // Create export directory
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  try {
    // Export in dependency order (parents before children)
    
    console.log('1. Exporting Users...');
    const users = await prisma.user.findMany();
    fs.writeFileSync(
      path.join(exportDir, '01-users.json'), 
      JSON.stringify(serializeBigInts(users), null, 2)
    );
    console.log(`   ✅ ${users.length} users exported\n`);

    console.log('2. Exporting Properties...');
    const properties = await prisma.property.findMany();
    fs.writeFileSync(
      path.join(exportDir, '02-properties.json'), 
      JSON.stringify(serializeBigInts(properties), null, 2)
    );
    console.log(`   ✅ ${properties.length} properties exported\n`);

    console.log('3. Exporting Property Analyses...');
    const propertyAnalyses = await prisma.propertyAnalysis.findMany();
    fs.writeFileSync(
      path.join(exportDir, '03-property-analyses.json'), 
      JSON.stringify(serializeBigInts(propertyAnalyses), null, 2)
    );
    console.log(`   ✅ ${propertyAnalyses.length} property analyses exported\n`);

    console.log('4. Exporting Comparable Sales...');
    const comparableSales = await prisma.comparableSales.findMany();
    fs.writeFileSync(
      path.join(exportDir, '04-comparable-sales.json'), 
      JSON.stringify(serializeBigInts(comparableSales), null, 2)
    );
    console.log(`   ✅ ${comparableSales.length} comparable sales exported\n`);

    console.log('5. Exporting Timelines...');
    const timelines = await prisma.timeline.findMany();
    fs.writeFileSync(
      path.join(exportDir, '05-timelines.json'), 
      JSON.stringify(serializeBigInts(timelines), null, 2)
    );
    console.log(`   ✅ ${timelines.length} timelines exported\n`);

    console.log('6. Exporting Timeline Steps...');
    const timelineSteps = await prisma.timelineStep.findMany();
    fs.writeFileSync(
      path.join(exportDir, '06-timeline-steps.json'), 
      JSON.stringify(serializeBigInts(timelineSteps), null, 2)
    );
    console.log(`   ✅ ${timelineSteps.length} timeline steps exported\n`);

    console.log('7. Exporting Timeline Documents...');
    const timelineDocuments = await prisma.timelineDocument.findMany();
    fs.writeFileSync(
      path.join(exportDir, '07-timeline-documents.json'), 
      JSON.stringify(serializeBigInts(timelineDocuments), null, 2)
    );
    console.log(`   ✅ ${timelineDocuments.length} timeline documents exported\n`);

    console.log('8. Exporting Timeline Team Members...');
    const timelineTeamMembers = await prisma.timelineTeamMember.findMany();
    fs.writeFileSync(
      path.join(exportDir, '08-timeline-team-members.json'), 
      JSON.stringify(serializeBigInts(timelineTeamMembers), null, 2)
    );
    console.log(`   ✅ ${timelineTeamMembers.length} timeline team members exported\n`);

    console.log('9. Exporting Timeline Notes...');
    const timelineNotes = await prisma.timelineNote.findMany();
    fs.writeFileSync(
      path.join(exportDir, '09-timeline-notes.json'), 
      JSON.stringify(serializeBigInts(timelineNotes), null, 2)
    );
    console.log(`   ✅ ${timelineNotes.length} timeline notes exported\n`);

    console.log('10. Exporting Timeline Step Comments...');
    const timelineStepComments = await prisma.timelineStepComment.findMany();
    fs.writeFileSync(
      path.join(exportDir, '10-timeline-step-comments.json'), 
      JSON.stringify(serializeBigInts(timelineStepComments), null, 2)
    );
    console.log(`   ✅ ${timelineStepComments.length} timeline step comments exported\n`);

    // Create summary
    const summary = {
      exportDate: new Date().toISOString(),
      totalRecords: users.length + properties.length + propertyAnalyses.length + 
                   comparableSales.length + timelines.length + timelineSteps.length + 
                   timelineDocuments.length + timelineTeamMembers.length + 
                   timelineNotes.length + timelineStepComments.length,
      tables: {
        users: users.length,
        properties: properties.length,
        propertyAnalyses: propertyAnalyses.length,
        comparableSales: comparableSales.length,
        timelines: timelines.length,
        timelineSteps: timelineSteps.length,
        timelineDocuments: timelineDocuments.length,
        timelineTeamMembers: timelineTeamMembers.length,
        timelineNotes: timelineNotes.length,
        timelineStepComments: timelineStepComments.length
      }
    };

    fs.writeFileSync(
      path.join(exportDir, '00-export-summary.json'), 
      JSON.stringify(summary, null, 2)
    );

    console.log('🎉 Data export completed successfully!');
    console.log(`   Total records exported: ${summary.totalRecords}`);
    console.log(`   Export location: ${exportDir}\n`);

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData().catch(console.error);