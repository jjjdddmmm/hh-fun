"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalysisConfirmationModal } from "./AnalysisConfirmationModal";
import { 
  FileText, 
  Upload, 
  Check, 
  Eye,
  Calendar,
  HardDrive,
  Plus,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface InspectionDocument {
  id: string;
  originalName: string;
  downloadUrl: string;
  documentType: string;
  fileSize: number;
  createdAt: string;
  stepTitle: string;
  stepCategory: string;
}

interface UploadedReport {
  id: string;
  name: string;
  type: 'home' | 'pool' | 'chimney' | 'sewer' | 'pest' | 'other';
  file?: File;
  documentData?: InspectionDocument;
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'error';
  issues?: any[];
}

interface ReportUploadSectionProps {
  onReportsUpload: (reports: UploadedReport[]) => void;
  reports: UploadedReport[];
  setReports: (reports: UploadedReport[]) => void;
  availableReports: InspectionDocument[];
  hasInitiatedAnalysis: boolean;
}

export function ReportUploadSection({ 
  onReportsUpload, 
  reports, 
  setReports, 
  availableReports,
  hasInitiatedAnalysis
}: ReportUploadSectionProps) {
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadSectionExpanded, setIsUploadSectionExpanded] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Sync selectedReportIds with actual reports
  React.useEffect(() => {
    const reportIds = new Set(reports.filter(r => r.documentData).map(r => r.documentData!.id));
    setSelectedReportIds(reportIds);
  }, [reports]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getReportType = (name: string, documentType: string): UploadedReport['type'] => {
    const lowerName = name.toLowerCase();
    const lowerType = documentType.toLowerCase();
    
    if (lowerName.includes('pool') || lowerType.includes('pool')) return 'pool';
    if (lowerName.includes('chimney') || lowerType.includes('chimney')) return 'chimney';
    if (lowerName.includes('sewer') || lowerType.includes('sewer')) return 'sewer';
    if (lowerName.includes('pest') || lowerType.includes('pest')) return 'pest';
    if (lowerName.includes('home') || lowerType.includes('home') || lowerType.includes('general')) return 'home';
    
    return 'other';
  };

  const handleSelectReport = (report: InspectionDocument) => {
    const newSelectedIds = new Set(selectedReportIds);
    
    if (newSelectedIds.has(report.id)) {
      newSelectedIds.delete(report.id);
      // Remove from selected reports
      setReports(reports.filter(r => r.documentData?.id !== report.id));
    } else {
      newSelectedIds.add(report.id);
      // Add to selected reports
      const newReport: UploadedReport = {
        id: report.id,
        name: report.originalName,
        type: getReportType(report.originalName, report.documentType),
        documentData: report,
        analysisStatus: 'pending'
      };
      setReports([...reports, newReport]);
    }
    
    setSelectedReportIds(newSelectedIds);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newReports: UploadedReport[] = files.map(file => ({
      id: `upload_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: getReportType(file.name, ''),
      file,
      analysisStatus: 'pending' as const
    }));
    
    setReports([...reports, ...newReports]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    const newReports: UploadedReport[] = files.map(file => ({
      id: `upload_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: getReportType(file.name, ''),
      file,
      analysisStatus: 'pending' as const
    }));
    
    setReports([...reports, ...newReports]);
  };

  const handleProceedToAnalysis = () => {
    if (reports.length > 0) {
      setShowConfirmationModal(true);
    }
  };

  const handleConfirmAnalysis = () => {
    setShowConfirmationModal(false);
    onReportsUpload(reports);
  };

  const removeReport = (reportId: string) => {
    setReports(reports.filter(r => r.id !== reportId));
    setSelectedReportIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(reportId);
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Existing Reports from Database */}
      {availableReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Your Inspection Reports
              <Badge variant="outline" className="ml-2">
                {availableReports.length} Available
              </Badge>
            </CardTitle>
            <p className="text-gray-600">
              Select reports from your completed timeline inspections to analyze for negotiation opportunities
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableReports.map((report) => {
                const isSelected = selectedReportIds.has(report.id);
                
                return (
                  <div
                    key={report.id}
                    className={`
                      relative p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-[#5C1B10] bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                    onClick={() => handleSelectReport(report)}
                  >
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-[#5C1B10] rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {/* File Icon */}
                      <div className="flex items-center justify-center h-12 w-12 bg-blue-100 rounded-lg mx-auto">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      
                      {/* Report Info */}
                      <div className="text-center">
                        <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2" title={report.originalName}>
                          {report.originalName}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">{report.stepTitle}</p>
                        
                        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(report.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatFileSize(report.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(report.downloadUrl, '_blank');
                          }}
                          className="flex-1 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Selected Reports Summary - only visible after analysis is initiated */}
            {reports.length > 0 && hasInitiatedAnalysis && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-gray-900">Selected for Analysis</h3>
                    <Badge className="bg-green-100 text-green-800">
                      {reports.length} Report{reports.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  {reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">{report.name}</p>
                          <p className="text-xs text-gray-600 capitalize">{report.type} inspection</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReport(report.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Analyze Reports Button - visible when reports are selected but analysis not initiated */}
            {reports.length > 0 && !hasInitiatedAnalysis && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">
                      {reports.length} Report{reports.length !== 1 ? 's' : ''} Selected
                    </span>
                  </div>
                  <Button
                    onClick={handleProceedToAnalysis}
                    className="bg-[#5C1B10] hover:bg-[#4A1508] text-white"
                  >
                    Analyze Reports ({reports.length})
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Upload Section - Now Collapsible */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setIsUploadSectionExpanded(!isUploadSectionExpanded)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-600" />
              Upload Additional Reports
            </div>
            {isUploadSectionExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </CardTitle>
          {!isUploadSectionExpanded && (
            <p className="text-gray-600 text-sm">
              Upload inspection reports not in your timeline • Click to expand
            </p>
          )}
        </CardHeader>
        {isUploadSectionExpanded && (
          <CardContent>
            <p className="text-gray-600 mb-4">
              Upload additional inspection reports that aren&apos;t in your timeline system
            </p>
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragOver 
                  ? 'border-[#5C1B10] bg-red-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drag files here or click to browse
              </h3>
              <p className="text-gray-600 mb-4">
                Support for PDF files up to 50MB each
              </p>
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Empty State */}
      {availableReports.length === 0 && reports.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Inspection Reports Found
              </h3>
              <p className="text-gray-600 mb-6">
                Complete some inspection steps in your timeline or upload reports directly to get started with negotiation analysis.
              </p>
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Confirmation Modal */}
      <AnalysisConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmAnalysis}
        reports={reports}
        remainingCredits={1}
      />
    </div>
  );
}