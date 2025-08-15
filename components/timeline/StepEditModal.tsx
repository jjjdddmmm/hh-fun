// Step Edit Modal - Enhanced UX for Document and Cost Management
// Allows editing individual documents and costs without full step re-completion

"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/lib/utils/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, File, CheckCircle, Loader2, AlertCircle, DollarSign, FileText, History, Eye } from "lucide-react";
import { TimelineStepWithRelations } from "@/lib/types/timeline";
import { documentVersionService } from "@/lib/services/DocumentVersionService";

interface StepEditModalProps {
  step: TimelineStepWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCost: (cost?: number) => Promise<void>;
  onUploadDocument: (file: File, replaceDocumentId?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

export function StepEditModal({
  step,
  isOpen,
  onClose,
  onUpdateCost,
  onUploadDocument,
  onRefresh,
  isLoading = false
}: StepEditModalProps) {
  const [actualCost, setActualCost] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [documentVersions, setDocumentVersions] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'cost' | 'documents' | 'history'>('cost');
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());
  const [replacingDocuments, setReplacingDocuments] = useState<Set<string>>(new Set());

  // Load step data when modal opens
  useEffect(() => {
    if (isOpen && step) {
      // Set current cost
      const currentCost = step.actualCost ? Number(step.actualCost) / 100 : 0;
      setActualCost(currentCost > 0 ? currentCost.toString() : '');
      
      // Load document versions
      loadDocumentVersions();
    }
  }, [isOpen, step?.id]);

  const loadDocumentVersions = async () => {
    if (!step) return;
    
    try {
      const versions = await documentVersionService.getDocumentsGroupedBySessions(step.id);
      setDocumentVersions(versions);
    } catch (error) {
      logger.error('Error loading document versions:', error);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setSelectedFiles([]);
    setDocumentVersions(null);
    setUploadingDocuments(new Set());
    setReplacingDocuments(new Set());
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

  const handleCostUpdate = async () => {
    const costValue = actualCost.trim() ? parseFloat(actualCost.replace(/[,$]/g, '')) : undefined;
    await onUpdateCost(costValue);
    await onRefresh();
  };

  const handleDocumentUpload = async (file: File, replaceDocumentId?: string) => {
    const uploadId = `${file.name}_${Date.now()}`;
    setUploadingDocuments(prev => new Set(prev).add(uploadId));
    
    try {
      await onUploadDocument(file, replaceDocumentId);
      await loadDocumentVersions();
      await onRefresh();
      
      // Remove file from selected files
      setSelectedFiles(prev => prev.filter(f => f !== file));
    } catch (error) {
      logger.error('Document upload error:', error);
      // Keep the file in the list if upload failed
    } finally {
      setUploadingDocuments(prev => {
        const next = new Set(prev);
        next.delete(uploadId);
        return next;
      });
    }
  };

  const handleReplaceDocument = async (documentId: string, file: File) => {
    setReplacingDocuments(prev => new Set(prev).add(documentId));
    
    try {
      await handleDocumentUpload(file, documentId);
    } finally {
      setReplacingDocuments(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!step) return null;

  const currentDocuments = documentVersions?.currentDocuments || [];
  const hasDocuments = currentDocuments.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] border-2 max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Edit Step: {step.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cost" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
              {hasDocuments && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1 rounded">{currentDocuments.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Cost Tab */}
          <TabsContent value="cost" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actual-cost" className="text-sm font-medium">
                Actual Cost for this Step
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
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500">
                Current: ${step.actualCost ? (Number(step.actualCost) / 100).toLocaleString() : '0.00'}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                disabled={isLoading}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCostUpdate} 
                disabled={isLoading}
                className="bg-[#5C1B10] hover:bg-[#4A1508] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Cost
              </Button>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Current Documents - Always shown first */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Current Documents
                {hasDocuments && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {currentDocuments.length} active
                  </span>
                )}
              </h4>
              
              {hasDocuments ? (
                <div className="space-y-3">
                  {currentDocuments.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-5 border-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <File className="h-6 w-6 text-gray-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate mb-1">{doc.originalName}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span className="bg-gray-50 px-2 py-1 rounded border">{formatFileSize(Number(doc.fileSize))}</span>
                            <span className="bg-gray-50 px-2 py-1 rounded border font-medium">Version {doc.documentVersion}</span>
                            <span className="bg-gray-50 px-2 py-1 rounded border">{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-3 flex-shrink-0 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(doc.downloadUrl, '_blank')}
                          className="text-xs px-3 py-2 border-gray-300 hover:bg-gray-50"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '*/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleReplaceDocument(doc.id, file);
                            };
                            input.click();
                          }}
                          disabled={replacingDocuments.has(doc.id)}
                          className="bg-[#5C1B10] hover:bg-[#4A1508] text-white text-xs px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {replacingDocuments.has(doc.id) ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3 mr-1" />
                          )}
                          {replacingDocuments.has(doc.id) ? 'Uploading...' : 'Upload New Version'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">No documents yet</p>
                  <p className="text-xs text-gray-500">Upload documents below to get started</p>
                </div>
              )}
            </div>

            {/* Upload Section */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {hasDocuments ? 'Add Additional Documents' : 'Upload New Documents'}
                {uploadingDocuments.size > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full animate-pulse">
                    {uploadingDocuments.size} uploading...
                  </span>
                )}
              </h4>
              
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
                <p className="text-xs text-gray-500 mb-3">
                  {hasDocuments 
                    ? 'Files with the same type will create new versions of existing documents'
                    : 'All uploaded files will be version 1'
                  }
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isLoading}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isLoading}
                />
              </div>

              {/* Selected Files Queue */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Files Ready to Upload ({selectedFiles.length})
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFiles([])}
                      className="text-xs border-gray-300 hover:bg-gray-50"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => {
                      // Create a stable upload ID for this file
                      const fileUploadId = `${file.name}_${file.size}_${index}`;
                      const isUploading = Array.from(uploadingDocuments).some(id => 
                        id.startsWith(`${file.name}_`)
                      );
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <File className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                <span>{formatFileSize(file.size)}</span>
                                {hasDocuments && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-700 font-medium">
                                      Will create new version
                                    </span>
                                  </>
                                )}
                                {isUploading && (
                                  <>
                                    <span>•</span>
                                    <span className="text-orange-600 font-medium animate-pulse">
                                      Uploading...
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleDocumentUpload(file)}
                              disabled={isUploading}
                              className="bg-[#5C1B10] hover:bg-[#4A1508] text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUploading ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Upload className="h-3 w-3 mr-1" />
                              )}
                              {isUploading ? 'Uploading...' : 'Upload'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              disabled={isUploading}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {documentVersions ? (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Document Version History</h4>
                {documentVersions.previousSessions.length > 0 ? (
                  <div className="space-y-3">
                    {documentVersions.previousSessions.map((session: any, index: number) => (
                      <div key={session.session.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">
                            Session {session.session.sessionNumber} 
                          </h5>
                          <span className="text-xs text-gray-500">
                            {formatDate(session.session.createdAt)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {session.documents.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{doc.originalName}</span>
                              <div className="flex space-x-2">
                                <span className="text-xs text-gray-500">v{doc.documentVersion}</span>
                                <Button variant="ghost" size="sm" onClick={() => window.open(doc.downloadUrl, '_blank')}>
                                  View
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No previous versions available</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-gray-600">Loading history...</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}