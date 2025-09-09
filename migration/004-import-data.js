#!/usr/bin/env node
// Import data to Supabase in the correct order (respecting foreign keys)

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Helper function to convert string back to BigInt where needed
function deserializeBigInts(obj, bigIntFields) {
  if (Array.isArray(obj)) {
    return obj.map(item => deserializeBigInts(item, bigIntFields));
  }
  
  if (obj && typeof obj === 'object') {
    const result = { ...obj };
    bigIntFields.forEach(field => {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = BigInt(result[field]);
      }
    });
    return result;
  }
  
  return obj;
}

async function importData() {
  console.log('📥 Importing data to Supabase...\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:Rh3aDxPctw8HJyIy@db.cfakyqthkdplvagvarxk.supabase.co:5432/postgres"
      }
    }
  });

  const exportDir = 'migration/data-export';

  try {
    // Check if export files exist
    const summaryPath = path.join(exportDir, '00-export-summary.json');
    if (!fs.existsSync(summaryPath)) {
      throw new Error('Export files not found. Run export script first.');
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log(`📊 Importing ${summary.totalRecords} total records...\n`);

    // Define BigInt fields for each model
    const propertyBigIntFields = [
      'price', 'askingPrice', 'propertyTaxes', 'hoaFees',
      'zestimate', 'zestimateRangeLow', 'zestimateRangeHigh',
      'rentZestimate', 'rentZestimateRangeLow', 'rentZestimateRangeHigh',
      'lastSalePrice', 'estimatedValue', 'equityAmount', 
      'mortgageBalance', 'estimatedRent'
    ];

    const timelineStepBigIntFields = ['estimatedCost', 'actualCost'];
    const timelineDocumentBigIntFields = ['fileSize'];

    // Import in dependency order (parents before children)
    
    console.log('1. Importing Users...');
    const usersData = JSON.parse(fs.readFileSync(path.join(exportDir, '01-users.json'), 'utf8'));
    for (const user of usersData) {
      await prisma.user.create({ data: user });
    }
    console.log(`   ✅ ${usersData.length} users imported\n`);

    console.log('2. Importing Properties...');
    const propertiesData = JSON.parse(fs.readFileSync(path.join(exportDir, '02-properties.json'), 'utf8'));
    const deserializedProperties = deserializeBigInts(propertiesData, propertyBigIntFields);
    for (const property of deserializedProperties) {
      await prisma.property.create({ data: property });
    }
    console.log(`   ✅ ${propertiesData.length} properties imported\n`);

    console.log('3. Importing Property Analyses...');
    const propertyAnalysesData = JSON.parse(fs.readFileSync(path.join(exportDir, '03-property-analyses.json'), 'utf8'));
    for (const analysis of propertyAnalysesData) {
      await prisma.propertyAnalysis.create({ data: analysis });
    }
    console.log(`   ✅ ${propertyAnalysesData.length} property analyses imported\n`);

    console.log('4. Importing Comparable Sales...');
    const comparableSalesData = JSON.parse(fs.readFileSync(path.join(exportDir, '04-comparable-sales.json'), 'utf8'));
    for (const comparable of comparableSalesData) {
      await prisma.comparableSales.create({ data: comparable });
    }
    console.log(`   ✅ ${comparableSalesData.length} comparable sales imported\n`);

    console.log('5. Importing Timelines...');
    const timelinesData = JSON.parse(fs.readFileSync(path.join(exportDir, '05-timelines.json'), 'utf8'));
    for (const timeline of timelinesData) {
      await prisma.timeline.create({ data: timeline });
    }
    console.log(`   ✅ ${timelinesData.length} timelines imported\n`);

    console.log('6. Importing Timeline Steps...');
    const timelineStepsData = JSON.parse(fs.readFileSync(path.join(exportDir, '06-timeline-steps.json'), 'utf8'));
    const deserializedSteps = deserializeBigInts(timelineStepsData, timelineStepBigIntFields);
    for (const step of deserializedSteps) {
      await prisma.timelineStep.create({ data: step });
    }
    console.log(`   ✅ ${timelineStepsData.length} timeline steps imported\n`);

    console.log('7. Importing Timeline Documents...');
    const timelineDocumentsData = JSON.parse(fs.readFileSync(path.join(exportDir, '07-timeline-documents.json'), 'utf8'));
    const deserializedDocuments = deserializeBigInts(timelineDocumentsData, timelineDocumentBigIntFields);
    for (const document of deserializedDocuments) {
      await prisma.timelineDocument.create({ data: document });
    }
    console.log(`   ✅ ${timelineDocumentsData.length} timeline documents imported\n`);

    console.log('8. Importing Timeline Team Members...');
    const timelineTeamMembersData = JSON.parse(fs.readFileSync(path.join(exportDir, '08-timeline-team-members.json'), 'utf8'));
    for (const teamMember of timelineTeamMembersData) {
      await prisma.timelineTeamMember.create({ data: teamMember });
    }
    console.log(`   ✅ ${timelineTeamMembersData.length} timeline team members imported\n`);

    console.log('9. Importing Timeline Notes...');
    const timelineNotesData = JSON.parse(fs.readFileSync(path.join(exportDir, '09-timeline-notes.json'), 'utf8'));
    for (const note of timelineNotesData) {
      await prisma.timelineNote.create({ data: note });
    }
    console.log(`   ✅ ${timelineNotesData.length} timeline notes imported\n`);

    console.log('10. Importing Timeline Step Comments...');
    const timelineStepCommentsData = JSON.parse(fs.readFileSync(path.join(exportDir, '10-timeline-step-comments.json'), 'utf8'));
    for (const comment of timelineStepCommentsData) {
      await prisma.timelineStepComment.create({ data: comment });
    }
    console.log(`   ✅ ${timelineStepCommentsData.length} timeline step comments imported\n`);

    console.log('🎉 Data import completed successfully!');
    console.log(`   Total records imported: ${summary.totalRecords}\n`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData().catch(console.error);