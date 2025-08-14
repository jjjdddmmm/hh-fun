// Generate Cloudinary Upload URL for Direct Client-Side Uploads
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@/lib/utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dk2knxbfj',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { folder, tags, context, fileName } = body;

    // Determine resource type based on file extension
    const resourceType = getResourceTypeFromFileName(fileName);
    
    // Generate timestamp for signature
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // For public file uploads, we'll use unsigned uploads with an upload preset
    // This avoids ACL issues with signed uploads
    const uploadPreset = 'hh_fun_public'; // We'll need to create this preset in Cloudinary
    
    // Explicitly set parameters for public access
    const signatureParams: Record<string, any> = {
      timestamp,
      folder: folder || `timeline/${userId}`,
      type: 'upload',
      access_mode: 'public'
    };
    
    // Tags should be a string for signature
    if (tags && tags.length > 0) {
      signatureParams.tags = tags.join(',');
    }

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(signatureParams, process.env.CLOUDINARY_API_SECRET!);

    logger.debug('Generated Cloudinary upload URL', {
      userId,
      folder: signatureParams.folder,
      timestamp,
      resourceType,
      signatureParams: Object.keys(signatureParams)
    });

    return NextResponse.json({
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder: signatureParams.folder,
      type: signatureParams.type,
      access_mode: signatureParams.access_mode,
      resource_type: resourceType,
      tags: tags || ['timeline', 'document'],
      context: context || {}
    });

  } catch (error) {
    logger.error('Error generating Cloudinary upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

// Helper function to determine resource type based on file extension
function getResourceTypeFromFileName(fileName: string): string {
  if (!fileName) return 'raw'; // Default to raw for safety
  
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'rtf':
    case 'xls':
    case 'xlsx':
      // Documents should be uploaded as raw to preserve original format
      return 'raw';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
      // Images can use image resource type
      return 'image';
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'wmv':
      // Videos use video resource type
      return 'video';
    default:
      // Unknown files as raw to preserve original format
      return 'raw';
  }
}