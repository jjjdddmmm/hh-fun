// useCloudinaryUpload Hook - Handle Direct Client-Side Uploads
import { useState } from 'react';
import { logger } from '@/lib/utils/logger';

interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  resource_type: string;
  type: string;
}

interface UseCloudinaryUploadOptions {
  folder?: string;
  tags?: string[];
  context?: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: CloudinaryUploadResult) => void;
  onError?: (error: Error) => void;
}

export function useCloudinaryUpload(options: UseCloudinaryUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0, loaded: 0, total: 0 });
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = async (file: File): Promise<CloudinaryUploadResult | null> => {
    setIsUploading(true);
    setError(null);
    setProgress({ percent: 0, loaded: 0, total: 0 });

    try {
      // Step 1: Get signed upload URL from our API
      const urlResponse = await fetch('/api/upload/cloudinary-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: options.folder,
          tags: options.tags,
          context: options.context
        })
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { url, signature, timestamp, api_key, folder, tags, context } = await urlResponse.json();

      // Step 2: Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', api_key);
      formData.append('folder', folder);
      
      // Add tags
      if (tags && tags.length > 0) {
        formData.append('tags', tags.join(','));
      }
      
      // Add context
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          formData.append(`context[${key}]`, value);
        });
      }

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            const progressData = {
              percent: percentComplete,
              loaded: e.loaded,
              total: e.total
            };
            setProgress(progressData);
            options.onProgress?.(progressData);
            
            logger.debug('Upload progress', {
              fileName: file.name,
              percent: percentComplete,
              loaded: `${(e.loaded / 1024 / 1024).toFixed(2)}MB`,
              total: `${(e.total / 1024 / 1024).toFixed(2)}MB`
            });
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText) as CloudinaryUploadResult;
            setIsUploading(false);
            options.onSuccess?.(result);
            
            logger.info('Cloudinary upload successful', {
              fileName: file.name,
              url: result.secure_url,
              size: result.bytes,
              publicId: result.public_id
            });
            
            resolve(result);
          } else {
            let errorMessage = `Upload failed with status ${xhr.status}: ${xhr.statusText}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error?.message || errorMessage;
            } catch (e) {
              // Use default error message if response isn't JSON
            }
            
            logger.error('Cloudinary upload failed', {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText,
              fileName: file.name
            });
            
            const error = new Error(errorMessage);
            setError(error);
            setIsUploading(false);
            options.onError?.(error);
            reject(error);
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          const error = new Error('Network error during upload');
          setError(error);
          setIsUploading(false);
          options.onError?.(error);
          reject(error);
        });

        // Send request
        xhr.open('POST', url);
        xhr.send(formData);
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      logger.error('Cloudinary upload error', error);
      setError(error);
      setIsUploading(false);
      options.onError?.(error);
      return null;
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress({ percent: 0, loaded: 0, total: 0 });
    setError(null);
  };

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    reset
  };
}