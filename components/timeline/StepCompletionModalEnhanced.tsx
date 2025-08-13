// Enhanced Step Completion Modal with Direct Cloudinary Upload
// Handles large files by uploading directly to Cloudinary from the browser

"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/lib/utils/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, File, CheckCircle, Loader2, AlertCircle, Cloud } from "lucide-react";
import { TimelineStepWithRelations } from "@/lib/types/timeline";
import { documentVersionService } from "@/lib/services/DocumentVersionService";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";
import { Progress } from "@/components/ui/progress";

interface StepCompletionModalProps {
  step: TimelineStepWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    actualCost?: number;
    documents: File[];
    cloudinaryDocuments?: Array<{ url: string; publicId: string; fileName: string; fileSize: number }>;
    completionSessionId: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

// 4MB threshold - files larger than this will use direct upload
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024;

export function StepCompletionModalEnhanced({
  step,
  isOpen,
  onClose,
  onComplete,
  isLoading = false
}: StepCompletionModalProps) {
  const [actualCost, setActualCost] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [completionSessionId, setCompletionSessionId] = useState<string>('');
  const [previousCompletions, setPreviousCompletions] = useState<number>(0);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { progress: number; error?: string }>>(new Map());

  // Cloudinary upload hook
  const cloudinaryUpload = useCloudinaryUpload({
    folder: step ? `timeline/${step.timelineId}/${step.id}` : undefined,
    tags: step ? ['timeline', 'step-document', step.category.toLowerCase(), step.id] : undefined,
    context: step ? {
      step_id: step.id,
      timeline_id: step.timelineId,
      category: step.category
    } : undefined,
    onProgress: (progress) => {
      logger.debug('Upload progress', progress);
    }
  });

  // Reset form when step changes or modal opens
  useEffect(() => {
    if (isOpen && step) {
      setActualCost('');
      setSelectedFiles([]);
      setIsDragOver(false);
      setUploadingFiles(new Map());
      
      const initializeSession = async () => {
        try {
          const sessionId = await documentVersionService.createCompletionSession(step.id);
          setCompletionSessionId(sessionId);
          
          await checkPreviousCompletions();
        } catch (error) {
          logger.error('Error initializing completion session:', error);
          setCompletionSessionId(`session_${step.id}_${Date.now()}`);
        }
      };
      
      initializeSession();
    }
  }, [isOpen, step?.id]);

  const checkPreviousCompletions = async () => {
    if (!step) return;
    
    try {
      const sessions = await documentVersionService.getCompletionSessions(step.id);
      setPreviousCompletions(sessions.length);
    } catch (error) {
      logger.error('Error checking previous completions:', error);
      setPreviousCompletions(0);
    }
  };

  const handleClose = () => {
    if (isLoading || cloudinaryUpload.isUploading) return;
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    const costValue = actualCost.trim() ? parseFloat(actualCost.replace(/[,$]/g, '')) : undefined;
    
    // Separate files into small (server upload) and large (direct upload)
    const smallFiles: File[] = [];
    const largeFiles: File[] = [];
    const cloudinaryDocuments: Array<{ url: string; publicId: string; fileName: string; fileSize: number }> = [];
    
    selectedFiles.forEach(file => {
      if (file.size > DIRECT_UPLOAD_THRESHOLD) {
        largeFiles.push(file);
      } else {
        smallFiles.push(file);
      }
    });

    // Upload large files directly to Cloudinary
    if (largeFiles.length > 0) {
      try {
        // Update UI to show uploading state
        const uploadMap = new Map<string, { progress: number; error?: string }>();
        largeFiles.forEach(file => {
          uploadMap.set(file.name, { progress: 0 });
        });
        setUploadingFiles(uploadMap);

        // Upload each large file
        for (const file of largeFiles) {
          try {
            // Update progress for this file
            setUploadingFiles(prev => {
              const updated = new Map(prev);
              updated.set(file.name, { progress: 10 });
              return updated;
            });

            const result = await cloudinaryUpload.uploadFile(file);
            
            if (result) {
              cloudinaryDocuments.push({
                url: result.secure_url,
                publicId: result.public_id,
                fileName: file.name,
                fileSize: file.size
              });

              // Mark as complete
              setUploadingFiles(prev => {
                const updated = new Map(prev);
                updated.set(file.name, { progress: 100 });
                return updated;
              });
            }
          } catch (error) {
            logger.error('Failed to upload large file', { fileName: file.name, error });
            
            // Mark as error
            setUploadingFiles(prev => {
              const updated = new Map(prev);
              updated.set(file.name, { progress: 0, error: 'Upload failed' });
              return updated;
            });
          }
        }
      } catch (error) {
        logger.error('Error uploading large files:', error);
        return; // Don't proceed if uploads failed
      }
    }
    
    // Complete with both small files (server upload) and cloudinary URLs
    await onComplete({
      actualCost: costValue,
      documents: smallFiles,
      cloudinaryDocuments: cloudinaryDocuments.length > 0 ? cloudinaryDocuments : undefined,
      completionSessionId: completionSessionId
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!step) return null;

  const isUploading = cloudinaryUpload.isUploading || isLoading;
  const hasLargeFiles = selectedFiles.some(file => file.size > DIRECT_UPLOAD_THRESHOLD);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Complete Step
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-gray-600">
            Would you like to upload any documents and enter costs for this step before marking it complete?
          </p>

          {previousCompletions > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 mb-1">
                    Step Previously Completed
                  </p>
                  <p className="text-amber-700">
                    This step has been completed {previousCompletions} time{previousCompletions !== 1 ? 's' : ''} before. 
                    New documents will create a new version while preserving previous documents for reference.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Area */}
          <div className="space-y-3">
            <Label htmlFor="file-upload" className="text-sm font-medium">
              Documents (Optional)
            </Label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag files here or click to browse
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Files larger than 4MB will be uploaded directly to cloud storage
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Files to Upload
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Selected Files ({selectedFiles.length})
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => {
                    const isLarge = file.size > DIRECT_UPLOAD_THRESHOLD;
                    const uploadStatus = uploadingFiles.get(file.name);
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                              {isLarge && (
                                <span className="text-xs text-blue-600 flex items-center gap-1">
                                  <Cloud className="h-3 w-3" />
                                  Direct upload
                                </span>
                              )}
                            </div>
                            {uploadStatus && uploadStatus.progress > 0 && uploadStatus.progress < 100 && (
                              <Progress value={uploadStatus.progress} className="h-1 mt-1" />
                            )}
                            {uploadStatus?.error && (
                              <p className="text-xs text-red-600 mt-1">{uploadStatus.error}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actual Cost Input */}
          <div className="space-y-2">
            <Label htmlFor="actual-cost" className="text-sm font-medium">
              Actual Cost (Optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="actual-cost"
                type="text"
                placeholder="0.00"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="pl-7"
                disabled={isUploading}
              />
            </div>
            <p className="text-xs text-gray-500">
              Enter the actual amount spent on this step
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isUploading}
              style={{ backgroundColor: '#5C1B10', color: 'white' }}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {hasLargeFiles ? 'Uploading Large Files...' : 'Uploading & Completing...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Step
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}