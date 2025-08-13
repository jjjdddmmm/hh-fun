// Document Upload API Route - Production Ready, Zero Tech Debt
// Handles file upload to Cloudinary and database storage

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadDocument } from '@/lib/cloudinary';
import { timelineService } from '@/lib/services/TimelineService';
import { generalRateLimiter } from '@/lib/rate-limiter';
import { fileOptimization } from '@/lib/services/FileOptimizationService';
import { z } from 'zod';

import { logger } from "@/lib/utils/logger";
// Validation schema
const uploadSchema = z.object({
  stepId: z.string().cuid(),
  timelineId: z.string().cuid(),
  stepCategory: z.string().min(1),
  fileName: z.string().min(1),
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
    const completionSessionId = formData.get('completionSessionId') as string;

    logger.debug('Upload request received:', {
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
      fileName: fileName || file?.name,
      completionSessionId: completionSessionId || undefined
    });
    
    // Determine document type from file extension or default to OTHER
    const documentType = getDocumentTypeFromFilename(validatedData.fileName);

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer for analysis
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Analyze and potentially optimize large files
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    let finalBuffer = fileBuffer;
    let optimizationInfo = null;

    if (file.size > maxSize) {
      logger.debug('File exceeds size limit, attempting optimization', {
        fileName: validatedData.fileName,
        originalSize: file.size,
        maxSize
      });

      const optimizationResult = await fileOptimization.optimizeFile(
        fileBuffer,
        validatedData.fileName,
        {
          maxSize,
          quality: 75,
          allowSplitting: false,
          preserveQuality: false
        }
      );

      if (!optimizationResult.success) {
        // Get user-friendly recommendations
        const recommendations = fileOptimization.getOptimizationRecommendations(
          file.size,
          validatedData.fileName
        );

        return NextResponse.json({
          success: false, 
          error: 'File too large and could not be optimized automatically.',
          details: {
            originalSize: file.size,
            maxSize,
            canOptimize: recommendations.canOptimize,
            recommendations: recommendations.recommendations,
            alternatives: recommendations.alternatives,
            optimizationError: optimizationResult.error
          }
        }, { status: 400 });
      }

      finalBuffer = optimizationResult.optimizedBuffer!;
      optimizationInfo = {
        originalSize: optimizationResult.originalSize,
        optimizedSize: optimizationResult.optimizedSize,
        compressionRatio: optimizationResult.compressionRatio,
        strategy: optimizationResult.strategy
      };

      logger.info('File optimized successfully', {
        fileName: validatedData.fileName,
        ...optimizationInfo
      });
    }

    // Timeline ownership will be verified by the createDocument method

    // Upload to Cloudinary using the optimized buffer
    const uploadResult = await uploadDocument(finalBuffer, {
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
      fileSize: finalBuffer.length, // Use optimized size
      documentType: documentType, // Use enum-compatible document type
      storageProvider: 'CLOUDINARY',
      storageKey: uploadResult.publicId,
      downloadUrl: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      uploadedBy: userId,
      completionSessionId: validatedData.completionSessionId
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
      optimization: optimizationInfo, // Include optimization details if any
      message: optimizationInfo 
        ? `Document uploaded successfully (optimized from ${(optimizationInfo.originalSize / 1024 / 1024).toFixed(1)}MB to ${(optimizationInfo.optimizedSize / 1024 / 1024).toFixed(1)}MB)`
        : 'Document uploaded successfully'
    });

  } catch (error) {
    logger.error('Document upload error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    if (error instanceof z.ZodError) {
      logger.error('Validation errors:', error.errors);
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
      logger.error('Error message:', error.message);
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