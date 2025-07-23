// Timeline Documents Component - Production Ready, Zero Tech Debt
// Step-based document management with visual card grid layout

"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  HardDrive,
  Filter
} from "lucide-react";
import { TimelineWithRelations, StepCategory } from "@/lib/types/timeline";
import { DocumentVersionsView } from "./DocumentVersionsView";
import { documentVersionService } from "@/lib/services/DocumentVersionService";

interface TimelineDocumentsProps {
  timeline: TimelineWithRelations;
  onDocumentUpdate: () => void;
}

export function TimelineDocuments({ timeline, onDocumentUpdate }: TimelineDocumentsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<StepCategory | "ALL">("ALL");
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [documentVersions, setDocumentVersions] = useState<Map<string, any>>(new Map());

  // Collect all documents organized by step
  const documentsByStep = useMemo(() => {
    const stepDocs = new Map();
    
    // Get documents from steps
    timeline.steps?.forEach(step => {
      if (step.documents && step.documents.length > 0) {
        stepDocs.set(step.id, {
          step,
          documents: step.documents
        });
      }
    });

    // Get general timeline documents (not attached to steps)
    const generalDocs = timeline.documents?.filter(doc => !doc.stepId) || [];
    if (generalDocs.length > 0) {
      stepDocs.set('general', {
        step: { 
          id: 'general', 
          title: 'General Documents', 
          category: 'PAPERWORK' as StepCategory,
          sortOrder: 999 
        },
        documents: generalDocs
      });
    }

    return stepDocs;
  }, [timeline]);

  // Calculate total document stats
  const documentStats = useMemo(() => {
    let totalDocs = 0;
    let totalSize = 0;

    documentsByStep.forEach(({ documents }) => {
      totalDocs += documents.length;
      totalSize += documents.reduce((sum: number, doc: any) => sum + Number(doc.fileSize || 0), 0);
    });

    return { totalDocs, totalSize };
  }, [documentsByStep]);

  // Filter documents based on search and category
  const filteredStepDocs = useMemo(() => {
    const filtered = new Map();

    documentsByStep.forEach(({ step, documents }, stepId) => {
      // Filter by category
      if (selectedCategory !== "ALL" && step.category !== selectedCategory) {
        return;
      }

      // Filter by search query
      const filteredDocs = documents.filter((doc: any) =>
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.originalName?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (filteredDocs.length > 0) {
        filtered.set(stepId, { step, documents: filteredDocs });
      }
    });

    return filtered;
  }, [documentsByStep, searchQuery, selectedCategory]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: StepCategory) => {
    switch (category) {
      case 'LEGAL': return 'bg-purple-100 text-purple-800';
      case 'FINANCING': return 'bg-green-100 text-green-800';
      case 'INSPECTION': return 'bg-blue-100 text-blue-800';
      case 'PAPERWORK': return 'bg-yellow-100 text-yellow-800';
      case 'COMMUNICATION': return 'bg-pink-100 text-pink-800';
      case 'CLOSING': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleStepExpansion = async (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
      
      // Load document versions for this step
      if (!documentVersions.has(stepId)) {
        try {
          const versions = await documentVersionService.getDocumentsGroupedBySessions(stepId);
          setDocumentVersions(prev => new Map(prev).set(stepId, versions));
        } catch (error) {
          console.error('Error loading document versions:', error);
        }
      }
    }
    setExpandedSteps(newExpanded);
  };

  const handleViewDocument = (doc: any) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
    }
  };

  const handleDownloadDocument = (doc: any) => {
    if (doc.downloadUrl) {
      const link = document.createElement('a');
      link.href = doc.downloadUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePromoteDocument = async (documentId: string) => {
    try {
      await documentVersionService.promoteDocumentToCurrent(documentId);
      
      // Refresh the document versions for the step
      const stepId = Object.keys(Object.fromEntries(documentVersions))
        .find(stepId => {
          const versions = documentVersions.get(stepId);
          return versions?.currentDocuments.some((doc: any) => doc.id === documentId) ||
                 versions?.previousSessions.some((session: any) => 
                   session.documents.some((doc: any) => doc.id === documentId));
        });
      
      if (stepId) {
        const versions = await documentVersionService.getDocumentsGroupedBySessions(stepId);
        setDocumentVersions(prev => new Map(prev).set(stepId, versions));
      }
      
      // Refresh timeline data
      onDocumentUpdate();
    } catch (error) {
      console.error('Error promoting document:', error);
    }
  };

  // Empty state
  if (documentStats.totalDocs === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <SectionHeader className="text-xl mb-2">No Documents Yet</SectionHeader>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Documents will appear here as you complete timeline steps and upload files during the process.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Upload documents by clicking &quot;Mark Complete&quot; on any timeline step
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <SectionHeader className="text-2xl mb-1">Documents</SectionHeader>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{documentStats.totalDocs} documents</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              <span>{formatFileSize(documentStats.totalSize)}</span>
            </div>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as StepCategory | "ALL")}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories</option>
            <option value="LEGAL">Legal</option>
            <option value="FINANCING">Financing</option>
            <option value="INSPECTION">Inspection</option>
            <option value="PAPERWORK">Paperwork</option>
            <option value="COMMUNICATION">Communication</option>
            <option value="CLOSING">Closing</option>
          </select>
        </div>
      </div>

      {/* Document Sections by Step */}
      <div className="space-y-4">
        {Array.from(filteredStepDocs.entries())
          .sort(([,a], [,b]) => a.step.sortOrder - b.step.sortOrder)
          .map(([stepId, { step, documents }]) => {
            const isExpanded = expandedSteps.has(stepId);
            
            return (
              <Card key={stepId} className="border-2">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleStepExpansion(stepId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{step.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getCategoryColor(step.category)}>
                            {step.category}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {documents.length} document{documents.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    {documentVersions.has(stepId) ? (
                      <DocumentVersionsView
                        stepId={stepId}
                        currentDocuments={documentVersions.get(stepId)?.currentDocuments || []}
                        previousSessions={documentVersions.get(stepId)?.previousSessions || []}
                        onPromoteDocument={handlePromoteDocument}
                        onDownload={handleDownloadDocument}
                      />
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                        <span className="ml-2 text-gray-600">Loading documents...</span>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
      </div>

      {/* No Results State */}
      {filteredStepDocs.size === 0 && documentStats.totalDocs > 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <SectionHeader className="text-lg mb-2">No Documents Found</SectionHeader>
              <p className="text-gray-600">
                Try adjusting your search terms or category filter.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}