#!/usr/bin/env node
// Setup Supabase Storage bucket

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function setupStorage() {
  console.log('🗄️  Setting up Supabase Storage...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Check existing buckets
    console.log('1. Checking existing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }
    
    console.log(`   Found ${buckets.length} existing buckets`);
    buckets.forEach(bucket => console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`));
    console.log();
    
    // Check if documents bucket exists
    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
    
    if (!documentsBucket) {
      console.log('2. Creating documents bucket...');
      const { data, error } = await supabase.storage.createBucket('documents', {
        public: false, // Private bucket for sensitive documents
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });
      
      if (error) {
        console.error('❌ Error creating bucket:', error.message);
        return;
      }
      
      console.log('   ✅ Documents bucket created successfully\n');
    } else {
      console.log('2. Documents bucket already exists\n');
    }
    
    // Test upload (optional)
    console.log('3. Testing storage permissions...');
    const testContent = 'This is a test file for storage permissions';
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload('test/test-file.txt', new Blob([testContent], { type: 'text/plain' }));
    
    if (uploadError) {
      console.log('   ⚠️  Upload test failed (this is expected for anon users)');
      console.log(`   Error: ${uploadError.message}`);
      console.log('   This is normal - uploads will work once authenticated\n');
    } else {
      console.log('   ✅ Upload test successful\n');
      
      // Clean up test file
      await supabase.storage.from('documents').remove(['test/test-file.txt']);
    }
    
    console.log('✅ Storage setup completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Set up Row Level Security (RLS) policies in Supabase dashboard');
    console.log('   2. Configure upload permissions for authenticated users');
    console.log('   3. Test file uploads from the application\n');
    
  } catch (error) {
    console.error('❌ Storage setup failed:', error.message);
  }
}

setupStorage().catch(console.error);