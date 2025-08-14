// Cloudinary Service - Handles authenticated access to Cloudinary resources
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@/lib/utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dk2knxbfj',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  /**
   * Downloads a file from Cloudinary using authenticated access
   * @param cloudinaryUrl The public Cloudinary URL
   * @returns Buffer of the file content
   */
  static async downloadFile(cloudinaryUrl: string): Promise<Buffer> {
    try {
      logger.debug('Attempting to download file from Cloudinary', {
        url: cloudinaryUrl
      });

      // Try direct download first (should work for new uploads)
      const response = await fetch(cloudinaryUrl, {
        headers: {
          'User-Agent': 'hh.fun-analysis/1.0',
          'Accept': '*/*'
        }
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        logger.debug('Successfully downloaded from Cloudinary', {
          size: arrayBuffer.byteLength
        });
        return Buffer.from(arrayBuffer);
      }

      // If direct download fails, this is likely an old file uploaded as image/upload
      // Extract public_id and try as raw resource type
      const publicId = this.extractPublicId(cloudinaryUrl);
      if (publicId && response.status === 401) {
        logger.debug('Trying legacy file access for old upload', { publicId });
        
        // Try accessing as raw resource type (for PDFs incorrectly uploaded as image)
        const rawUrl = `https://res.cloudinary.com/dk2knxbfj/raw/upload/v1/${publicId}.pdf`;
        const rawResponse = await fetch(rawUrl, {
          headers: {
            'User-Agent': 'hh.fun-analysis/1.0',
            'Accept': '*/*'
          }
        });

        if (rawResponse.ok) {
          const arrayBuffer = await rawResponse.arrayBuffer();
          logger.debug('Successfully downloaded legacy file as raw', {
            size: arrayBuffer.byteLength
          });
          return Buffer.from(arrayBuffer);
        }
      }

      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);

    } catch (error) {
      logger.error('CloudinaryService download error', {
        error: error instanceof Error ? error.message : String(error),
        url: cloudinaryUrl
      });
      throw error;
    }
  }

  /**
   * Extracts the public_id from a Cloudinary URL
   */
  private static extractPublicId(url: string): string | null {
    try {
      // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{folder}/{filename}.{ext}
      const urlParts = url.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      
      if (uploadIndex === -1 || uploadIndex >= urlParts.length - 1) {
        return null;
      }

      // Get everything after 'upload/v{version}/'
      const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
      
      // Remove file extension
      const lastDotIndex = pathAfterUpload.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return pathAfterUpload.substring(0, lastDotIndex);
      }
      
      return pathAfterUpload;
    } catch (error) {
      logger.error('Error extracting public ID', { error, url });
      return null;
    }
  }

}