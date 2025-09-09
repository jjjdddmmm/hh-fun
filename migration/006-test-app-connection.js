#!/usr/bin/env node
// Test that the app now connects to Supabase

const { PrismaClient } = require('@prisma/client');

async function testAppConnection() {
  console.log('🔗 Testing application connection to Supabase...\n');

  // This uses the default DATABASE_URL from .env (now pointing to Supabase)
  const prisma = new PrismaClient();

  try {
    const userCount = await prisma.user.count();
    const propertyCount = await prisma.property.count();
    const timelineCount = await prisma.timeline.count();
    
    console.log('✅ Application successfully connected to Supabase!');
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Properties: ${propertyCount}`);
    console.log(`   - Timelines: ${timelineCount}\n`);
    
    // Test a complex query
    const userWithData = await prisma.user.findFirst({
      include: {
        properties: {
          include: {
            timeline: {
              include: {
                steps: true,
                documents: true
              }
            }
          }
        }
      }
    });
    
    if (userWithData) {
      console.log('✅ Complex queries work correctly');
      console.log(`   User: ${userWithData.name || userWithData.email}`);
      console.log(`   Properties: ${userWithData.properties.length}`);
      const totalSteps = userWithData.properties.reduce((sum, p) => sum + (p.timeline?.steps.length || 0), 0);
      const totalDocs = userWithData.properties.reduce((sum, p) => sum + (p.timeline?.documents.length || 0), 0);
      console.log(`   Total timeline steps: ${totalSteps}`);
      console.log(`   Total documents: ${totalDocs}\n`);
    }
    
    console.log('🎉 All tests passed! Application is ready to use Supabase.\n');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAppConnection().catch(console.error);