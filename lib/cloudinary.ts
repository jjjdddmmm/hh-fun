// Cloudinary Configuration - Production Ready, Zero Tech Debt
// Handles document upload and management for timeline steps

import { v2 as cloudinary } from 'cloudinary';

import { logger } from "@/lib/utils/logger";
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dk2knxbfj',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Debug: Check if configuration is loaded
// logger.debug("API call made");

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
    logger.debug('Cloudinary upload starting for:', options.fileName);
    
    // Create folder structure: timeline/{timelineId}/{stepId}
    const folder = `timeline/${options.timelineId}/${options.stepId}`;
    
    // Sanitize filename for Cloudinary (remove special characters)
    const sanitizedFileName = options.fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    logger.debug('Sanitized filename:', sanitizedFileName);
    logger.debug('Upload folder:', folder);
    
    return new Promise((resolve, reject) => {
      // Determine resource type based on file type to preserve PDFs
      const resourceType = getResourceType(options.fileName);
      
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: `${sanitizedFileName}-${Date.now()}`,
          // Only apply transformations to non-raw resources
          ...(resourceType !== 'raw' && {
            transformation: [
              { quality: "auto" },
              { fetch_format: "auto" }
            ]
          }),
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
            // Generate thumbnail URL for preview - handle raw resources differently
            let thumbnailUrl;
            if (resourceType === 'raw') {
              // For raw resources (PDFs), convert to image thumbnail
              thumbnailUrl = cloudinary.url(result.public_id, {
                resource_type: 'raw',
                transformation: [
                  { 
                    width: 300, 
                    height: 200, 
                    crop: 'fill',
                    format: 'jpg',
                    quality: 'auto',
                    page: 1 // First page for PDF thumbnails
                  }
                ]
              });
            } else {
              // For regular images, use direct transformation
              thumbnailUrl = result.secure_url.replace(
                '/upload/', 
                '/upload/w_300,h_200,c_fill,f_auto,q_auto/'
              );
            }

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
    logger.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete document from Cloudinary
export async function deleteDocument(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
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

// Helper function to determine resource type based on file extension
function getResourceType(fileName: string): 'auto' | 'image' | 'video' | 'raw' {
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      // PDFs as raw to preserve original format and prevent conversion to images
      return 'raw';
    case 'doc':
    case 'docx':
    case 'txt':
    case 'rtf':
      // Documents as raw to preserve original format
      return 'raw';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
      // Images can use auto (allows transformations)
      return 'auto';
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

export default cloudinary;