#!/usr/bin/env node
// Test connections to both databases

const { PrismaClient } = require('@prisma/client');

async function testConnections() {
  console.log('🔍 Testing database connections...\n');

  // Test Neon connection
  console.log('1. Testing Neon connection...');
  const neonPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_HqGpfYzj8Ds5@ep-autumn-rain-adxtmygh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
      }
    }
  });

  try {
    const userCount = await neonPrisma.user.count();
    const propertyCount = await neonPrisma.property.count();
    console.log(`✅ Neon connected successfully!`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Properties: ${propertyCount}\n`);
  } catch (error) {
    console.error('❌ Neon connection failed:', error.message);
    process.exit(1);
  } finally {
    await neonPrisma.$disconnect();
  }

  // Test Supabase connection
  console.log('2. Testing Supabase connection...');
  const supabasePrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:Rh3aDxPctw8HJyIy@db.cfakyqthkdplvagvarxk.supabase.co:5432/postgres"
      }
    }
  });

  try {
    // Just test the connection, tables might not exist yet
    await supabasePrisma.$queryRaw`SELECT 1`;
    console.log('✅ Supabase connected successfully!\n');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    process.exit(1);
  } finally {
    await supabasePrisma.$disconnect();
  }

  console.log('✅ All connections successful!\n');
}

testConnections().catch(console.error);