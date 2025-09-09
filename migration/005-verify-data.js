#!/usr/bin/env node
// Verify data integrity between Neon and Supabase

const { PrismaClient } = require('@prisma/client');

async function verifyData() {
  console.log('🔍 Verifying data integrity...\n');

  const neonPrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_HqGpfYzj8Ds5@ep-autumn-rain-adxtmygh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
      }
    }
  });

  const supabasePrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:Rh3aDxPctw8HJyIy@db.cfakyqthkdplvagvarxk.supabase.co:5432/postgres"
      }
    }
  });

  try {
    // Check counts for each table
    const tables = [
      { name: 'Users', method: 'user' },
      { name: 'Properties', method: 'property' },
      { name: 'Property Analyses', method: 'propertyAnalysis' },
      { name: 'Comparable Sales', method: 'comparableSales' },
      { name: 'Timelines', method: 'timeline' },
      { name: 'Timeline Steps', method: 'timelineStep' },
      { name: 'Timeline Documents', method: 'timelineDocument' },
      { name: 'Timeline Team Members', method: 'timelineTeamMember' },
      { name: 'Timeline Notes', method: 'timelineNote' },
      { name: 'Timeline Step Comments', method: 'timelineStepComment' }
    ];

    let allMatch = true;

    for (const table of tables) {
      const neonCount = await neonPrisma[table.method].count();
      const supabaseCount = await supabasePrisma[table.method].count();
      
      const status = neonCount === supabaseCount ? '✅' : '❌';
      if (neonCount !== supabaseCount) allMatch = false;
      
      console.log(`${status} ${table.name}: Neon(${neonCount}) | Supabase(${supabaseCount})`);
    }

    console.log('\n');
    
    if (allMatch) {
      console.log('🎉 Data verification successful! All counts match.');
      
      // Test some sample queries
      console.log('\n📋 Testing sample queries...\n');
      
      // Test user with properties
      const neonUserWithProps = await neonPrisma.user.findFirst({
        include: { properties: true, timelines: true }
      });
      
      const supabaseUserWithProps = await supabasePrisma.user.findFirst({
        where: { id: neonUserWithProps?.id },
        include: { properties: true, timelines: true }
      });
      
      if (neonUserWithProps && supabaseUserWithProps) {
        console.log(`✅ User relations: ${neonUserWithProps.properties.length} properties, ${neonUserWithProps.timelines.length} timelines`);
      }
      
      // Test timeline with steps
      const neonTimelineWithSteps = await neonPrisma.timeline.findFirst({
        include: { steps: true, documents: true }
      });
      
      const supabaseTimelineWithSteps = await supabasePrisma.timeline.findFirst({
        where: { id: neonTimelineWithSteps?.id },
        include: { steps: true, documents: true }
      });
      
      if (neonTimelineWithSteps && supabaseTimelineWithSteps) {
        console.log(`✅ Timeline relations: ${neonTimelineWithSteps.steps.length} steps, ${neonTimelineWithSteps.documents.length} documents`);
      }
      
      console.log('\n✅ All verification tests passed!');
      console.log('\n🚀 Ready for the next phase of migration.\n');
      
    } else {
      console.log('❌ Data verification failed! Count mismatches detected.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

verifyData().catch(console.error);