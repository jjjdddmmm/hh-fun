import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

interface SupabaseUploadResult {
  path: string;
  fullPath: string;
  publicUrl?: string;
}

interface UseSupabaseUploadOptions {
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: SupabaseUploadResult) => void;
  onError?: (error: Error) => void;
}

export function useSupabaseUpload(options: UseSupabaseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0, loaded: 0, total: 0 });
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = async (file: File, userId: string): Promise<SupabaseUploadResult | null> => {
    setIsUploading(true);
    setError(null);
    setProgress({ percent: 0, loaded: 0, total: 0 });

    try {
      logger.info('Starting server-side Supabase upload', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        folder: options.folder
      });

      // Create form data for API upload
      const formData = new FormData();
      formData.append('file', file);
      if (options.folder) {
        formData.append('folder', options.folder);
      }

      // Simulate progress during upload
      const simulateProgress = () => {
        const steps = [20, 40, 60, 80, 95];
        let currentStep = 0;
        
        const interval = setInterval(() => {
          if (currentStep < steps.length) {
            const percent = steps[currentStep];
            const loaded = (file.size * percent) / 100;
            const progressData = {
              percent,
              loaded,
              total: file.size
            };
            setProgress(progressData);
            options.onProgress?.(progressData);
            currentStep++;
          } else {
            clearInterval(interval);
          }
        }, 150);

        return interval;
      };

      const progressInterval = simulateProgress();

      // Upload via API route (uses service role key, bypasses RLS)
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Final progress update
      const finalProgress = {
        percent: 100,
        loaded: file.size,
        total: file.size
      };
      setProgress(finalProgress);
      options.onProgress?.(finalProgress);

      const uploadResult: SupabaseUploadResult = {
        path: result.data.path,
        fullPath: result.data.fullPath,
        publicUrl: result.data.publicUrl
      };

      setIsUploading(false);
      options.onSuccess?.(uploadResult);

      logger.info('Server-side Supabase upload successful', {
        fileName: file.name,
        path: result.data.path,
        size: file.size
      });

      return uploadResult;

    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Upload failed');
      logger.error('Supabase upload error', uploadError);
      setError(uploadError);
      setIsUploading(false);
      options.onError?.(uploadError);
      return null;
    }
  };

  const getPublicUrl = (path: string): string => {
    // Return the standard Supabase public URL format
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/documents/${path}`;
  };

  const getSignedUrl = async (path: string, expiresIn: number = 3600): Promise<string | null> => {
    // For signed URLs, we'd need to call an API route since this requires server-side access
    try {
      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, expiresIn })
      });
      
      if (!response.ok) return null;
      
      const result = await response.json();
      return result.signedUrl;
    } catch (error) {
      logger.error('Error creating signed URL', error);
      return null;
    }
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    // For file deletion, we'd need to call an API route since this requires server-side access
    try {
      const response = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      
      return response.ok;
    } catch (error) {
      logger.error('Error deleting file', error);
      return false;
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress({ percent: 0, loaded: 0, total: 0 });
    setError(null);
  };

  return {
    uploadFile,
    getPublicUrl,
    getSignedUrl,
    deleteFile,
    isUploading,
    progress,
    error,
    reset
  };
}