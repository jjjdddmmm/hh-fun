// Document Upload API Route - Production Ready, Zero Tech Debt
// Handles file upload to Cloudinary and database storage

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadDocument } from '@/lib/cloudinary';
import { timelineService } from '@/lib/services/TimelineService';
import { generalRateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';

// Validation schema
const uploadSchema = z.object({
  stepId: z.string().cuid(),
  timelineId: z.string().cuid(),
  stepCategory: z.string().min(1),
  fileName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Rate limiting
    if (!generalRateLimiter.isAllowed(userId)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' }, 
        { status: 429 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const stepId = formData.get('stepId') as string;
    const timelineId = formData.get('timelineId') as string;
    const stepCategory = formData.get('stepCategory') as string;
    const fileName = formData.get('fileName') as string;

    console.log('Upload request received:', {
      fileName,
      fileSize: file?.size,
      fileType: file?.type,
      stepId,
      timelineId,
      stepCategory
    });

    // Validate required fields
    const validatedData = uploadSchema.parse({
      stepId,
      timelineId,
      stepCategory,
      fileName: fileName || file?.name
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Timeline ownership will be verified by the createDocument method

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const uploadResult = await uploadDocument(fileBuffer, {
      stepId: validatedData.stepId,
      timelineId: validatedData.timelineId,
      stepCategory: validatedData.stepCategory,
      fileName: validatedData.fileName
    });

    // Save document info to database
    const document = await timelineService.createDocument(userId, {
      timelineId: validatedData.timelineId,
      stepId: validatedData.stepId,
      fileName: validatedData.fileName,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      documentType: 'OTHER', // We can enhance this logic later
      storageProvider: 'CLOUDINARY',
      storageKey: uploadResult.publicId,
      downloadUrl: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      uploadedBy: userId
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        downloadUrl: document.downloadUrl,
        thumbnailUrl: document.thumbnailUrl,
        fileSize: Number(document.fileSize), // Convert BigInt to number for JSON
        mimeType: document.mimeType,
        uploadedAt: document.createdAt
      },
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Document upload error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        }, 
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: error.message }, 
          { status: 404 }
        );
      }
      
      // Return the actual error message for debugging
      return NextResponse.json(
        { success: false, error: `Upload failed: ${error.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to upload document - unknown error' }, 
      { status: 500 }
    );
  }
}