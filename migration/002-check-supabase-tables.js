#!/usr/bin/env node
// Check existing tables in Supabase

const { PrismaClient } = require('@prisma/client');

async function checkSupabaseTables() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:Rh3aDxPctw8HJyIy@db.cfakyqthkdplvagvarxk.supabase.co:5432/postgres"
      }
    }
  });

  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('📋 Existing tables in Supabase:\n');
    
    if (tables.length === 0) {
      console.log('   No tables found (clean database)\n');
    } else {
      tables.forEach(t => console.log(`   - ${t.table_name}`));
      console.log(`\n   Total: ${tables.length} tables\n`);
    }

    // Check for our specific tables
    const ourTables = ['users', 'properties', 'timelines', 'timeline_steps'];
    const existingOurTables = tables.filter(t => ourTables.includes(t.table_name));
    
    if (existingOurTables.length > 0) {
      console.log('⚠️  WARNING: Some of our tables already exist!');
      console.log('   This might cause conflicts during migration.\n');
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSupabaseTables().catch(console.error);