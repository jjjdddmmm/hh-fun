// Cloudinary Configuration - Production Ready, Zero Tech Debt
// Handles document upload and management for timeline steps

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dk2knxbfj',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Debug: Check if configuration is loaded
console.log('Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dk2knxbfj',
  api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET',
});

// Upload options for timeline documents
export interface DocumentUploadOptions {
  stepId: string;
  timelineId: string;
  stepCategory: string;
  fileName: string;
}

// Upload document to Cloudinary
export async function uploadDocument(
  fileBuffer: Buffer, 
  options: DocumentUploadOptions
): Promise<{
  url: string;
  publicId: string;
  thumbnailUrl: string;
  fileSize: number;
  format: string;
}> {
  try {
    console.log('Cloudinary upload starting for:', options.fileName);
    
    // Create folder structure: timeline/{timelineId}/{stepId}
    const folder = `timeline/${options.timelineId}/${options.stepId}`;
    
    // Sanitize filename for Cloudinary (remove special characters)
    const sanitizedFileName = options.fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    console.log('Sanitized filename:', sanitizedFileName);
    console.log('Upload folder:', folder);
    
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          public_id: `${sanitizedFileName}-${Date.now()}`,
          transformation: [
            { quality: "auto" },
            { fetch_format: "auto" }
          ],
          tags: [
            "timeline", 
            "step-document", 
            options.stepCategory.toLowerCase(),
            options.stepId
          ],
          context: {
            step_id: options.stepId,
            timeline_id: options.timelineId,
            category: options.stepCategory
          }
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            // Generate thumbnail URL for preview (300x200 crop)
            const thumbnailUrl = result.secure_url.replace(
              '/upload/', 
              '/upload/w_300,h_200,c_fill,f_auto,q_auto/'
            );

            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              thumbnailUrl,
              fileSize: result.bytes,
              format: result.format
            });
          } else {
            reject(new Error('Upload failed - no result'));
          }
        }
      );

      // Write buffer to stream
      stream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete document from Cloudinary
export async function deleteDocument(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate signed URL for secure access
export function generateSignedUrl(publicId: string, expiresIn: number = 3600): string {
  const timestamp = Math.round(Date.now() / 1000) + expiresIn;
  
  return cloudinary.utils.private_download_url(publicId, 'auto', {
    expires_at: timestamp
  });
}

export default cloudinary;