-- Supabase Storage RLS Policy Setup
-- Run this in your Supabase SQL Editor

-- OPTION 1: Disable RLS entirely for storage.objects (recommended for your use case)
-- This is the cleanest solution since your bucket is already public and you control access in your app

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Drop all existing policies on storage.objects
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Disable RLS entirely for storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled and policies are removed
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    COUNT(*) as policy_count
FROM pg_policies p
RIGHT JOIN pg_tables t ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.tablename = 'objects' AND t.schemaname = 'storage'
GROUP BY schemaname, tablename, rowsecurity;

-- OPTION 2: Alternative approach with permissive RLS (uncomment if you prefer this)
-- This keeps RLS enabled but allows all operations on the documents bucket

/*
-- Re-enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for documents bucket
CREATE POLICY "Allow all operations on documents bucket" ON storage.objects
FOR ALL USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
*/