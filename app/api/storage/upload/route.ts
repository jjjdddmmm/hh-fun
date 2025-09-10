// Storage Upload API Route - Secure server-side uploads to Supabase
// Bypasses RLS policies using service role key

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Storage service unavailable' },
        { status: 503 }
      );
    }

    // Get form data from request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create file path
    const timestamp = new Date().getTime();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folderPath = folder || 'documents';
    const filePath = `${userId}/${folderPath}/${timestamp}-${sanitizedFileName}`;

    logger.info('Starting server-side Supabase upload', {
      fileName: file.name,
      fileSize: file.size,
      filePath,
      mimeType: file.type
    });

    // Upload using service role key (bypasses RLS)
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      logger.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Generate public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${data.path}`;

    const result = {
      path: data.path,
      fullPath: data.fullPath,
      publicUrl
    };

    logger.info('Server-side Supabase upload successful', {
      fileName: file.name,
      path: data.path,
      size: file.size
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Storage upload API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}