import { useState } from 'react';
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
      // Create file path: userId/folder/timestamp-filename
      const timestamp = new Date().getTime();
      const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
      const folder = options.folder || 'documents';
      const filePath = `${userId}/${folder}/${timestamp}-${fileName}`;

      logger.info('Starting Supabase upload', {
        fileName: file.name,
        fileSize: file.size,
        filePath,
        mimeType: file.type
      });

      // Use fetch to upload via API route instead of direct client access
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload/supabase', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Upload failed: ${result.error}`);
      }

      // For now, we'll simulate progress since Supabase doesn't provide native progress tracking
      // In a real implementation, you might want to use chunked uploads for large files
      const simulateProgress = () => {
        const steps = [20, 40, 60, 80, 95, 100];
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
        }, 100);
      };

      simulateProgress();

      const uploadResult: SupabaseUploadResult = {
        path: result.path,
        fullPath: result.fullPath,
        publicUrl: result.publicUrl
      };

      setIsUploading(false);
      options.onSuccess?.(uploadResult);

      logger.info('Supabase upload successful', {
        fileName: file.name,
        path: result.path,
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
    const { data } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(path);
    
    return data.publicUrl;
  };

  const getSignedUrl = async (path: string, expiresIn: number = 3600): Promise<string | null> => {
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      logger.error('Error creating signed URL', error);
      return null;
    }
    
    return data.signedUrl;
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    const { error } = await supabaseAdmin.storage
      .from('documents')
      .remove([path]);
    
    if (error) {
      logger.error('Error deleting file', error);
      return false;
    }
    
    return true;
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