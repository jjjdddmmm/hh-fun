// Save Cloudinary Document API Route
// Saves documents that were uploaded directly to Cloudinary from the client

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { timelineService } from '@/lib/services/TimelineService';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// Validation schema
const saveCloudinarySchema = z.object({
  timelineId: z.string().cuid(),
  stepId: z.string().cuid(),
  fileName: z.string().min(1),
  downloadUrl: z.string().url(),
  storageKey: z.string().min(1),
  fileSize: z.number().positive(),
  completionSessionId: z.string().optional(),
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

    const body = await request.json();
    
    logger.debug('Save Cloudinary document request:', {
      fileName: body.fileName,
      fileSize: body.fileSize,
      stepId: body.stepId,
      timelineId: body.timelineId
    });

    // Validate input
    const validatedData = saveCloudinarySchema.parse(body);

    // Extract file type from URL or filename
    const fileExtension = validatedData.fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(fileExtension);
    
    // Determine document type from file extension or default to OTHER
    const documentType = getDocumentTypeFromFilename(validatedData.fileName);

    // Save document info to database
    logger.debug('Saving document to database', {
      userId,
      timelineId: validatedData.timelineId,
      stepId: validatedData.stepId,
      fileName: validatedData.fileName,
      fileSize: validatedData.fileSize
    });
    
    const document = await timelineService.createDocument(userId, {
      timelineId: validatedData.timelineId,
      stepId: validatedData.stepId,
      fileName: validatedData.fileName,
      originalName: validatedData.fileName,
      mimeType,
      fileSize: validatedData.fileSize,
      documentType: documentType, // Use enum-compatible document type
      storageProvider: 'CLOUDINARY',
      storageKey: validatedData.storageKey,
      downloadUrl: validatedData.downloadUrl,
      thumbnailUrl: generateThumbnailUrl(validatedData.downloadUrl, fileExtension),
      uploadedBy: userId,
      completionSessionId: validatedData.completionSessionId
    });

    logger.info('Cloudinary document saved successfully', {
      documentId: document.id,
      fileName: document.fileName,
      fileSize: Number(document.fileSize) // Convert BigInt to number for logging
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
      message: 'Cloudinary document saved successfully'
    });

  } catch (error) {
    logger.error('Save Cloudinary document error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      fileName: body?.fileName,
      stepId: body?.stepId,
      timelineId: body?.timelineId
    });

    if (error instanceof z.ZodError) {
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
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: error.message }, 
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to save document' }, 
      { status: 500 }
    );
  }
}

// Helper function to get MIME type from extension
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// Helper function to determine document type from filename
function getDocumentTypeFromFilename(filename: string): string {
  const lowerName = filename.toLowerCase();
  
  // Check for common document types in filename
  if (lowerName.includes('contract') || lowerName.includes('agreement')) return 'CONTRACT';
  if (lowerName.includes('financial') || lowerName.includes('bank') || lowerName.includes('loan')) return 'FINANCIAL';
  if (lowerName.includes('inspection') || lowerName.includes('inspect')) return 'INSPECTION';
  if (lowerName.includes('appraisal') || lowerName.includes('apprai')) return 'APPRAISAL';
  if (lowerName.includes('insurance')) return 'INSURANCE';
  if (lowerName.includes('title')) return 'TITLE';
  if (lowerName.includes('mortgage') || lowerName.includes('mtg')) return 'MORTGAGE';
  if (lowerName.includes('closing') || lowerName.includes('settlement')) return 'CLOSING';
  if (lowerName.includes('correspondence') || lowerName.includes('email') || lowerName.includes('letter')) return 'CORRESPONDENCE';
  if (lowerName.includes('receipt') || lowerName.includes('invoice')) return 'RECEIPT';
  
  // Default to OTHER for unrecognized types
  return 'OTHER';
}

// Helper function to generate thumbnail URL
function generateThumbnailUrl(url: string, extension: string): string {
  // For images, add transformation parameters
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return url.replace('/upload/', '/upload/w_300,h_200,c_fill,f_auto,q_auto/');
  }
  
  // For PDFs and documents, Cloudinary can generate image previews
  if (extension === 'pdf') {
    return url.replace('/upload/', '/upload/w_300,h_200,c_fill,f_jpg,pg_1/');
  }
  
  // For other files, return the original URL
  return url;
}