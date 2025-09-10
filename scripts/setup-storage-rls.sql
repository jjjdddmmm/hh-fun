-- Supabase Storage RLS Policy Setup for documents bucket
-- Run this in your Supabase SQL Editor

-- Check current policies first
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Drop existing restrictive policies (these might be blocking uploads)
-- Common auto-generated policy names that might exist
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_3" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Create a single permissive policy that allows all operations on documents bucket
-- This replaces restrictive policies with one that allows everything
CREATE POLICY "Allow all operations on documents bucket" ON storage.objects
FOR ALL 
TO public
USING (bucket_id = 'documents') 
WITH CHECK (bucket_id = 'documents');

-- Verify the new policy exists
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';