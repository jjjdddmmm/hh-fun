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
    const { folder, tags, context } = body;

    // Generate timestamp for signature
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Create signature parameters - only include parameters that affect the signature
    const signatureParams: Record<string, any> = {
      timestamp,
      folder: folder || `timeline/${userId}`,
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
      timestamp
    });

    return NextResponse.json({
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder: signatureParams.folder,
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