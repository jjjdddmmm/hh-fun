"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  FileText, 
  Clock,
  CreditCard,
  CheckCircle,
  Target
} from "lucide-react";

interface UploadedReport {
  id: string;
  name: string;
  type: 'home' | 'pool' | 'chimney' | 'sewer' | 'pest' | 'other';
  file?: File;
  documentData?: any;
}

interface AnalysisConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reports: UploadedReport[];
  remainingCredits?: number;
  isAnalyzing?: boolean;
}

export function AnalysisConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  reports,
  remainingCredits = 1,
  isAnalyzing = false
}: AnalysisConfirmationModalProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getTotalSize = () => {
    return reports.reduce((total, report) => {
      if (report.file) {
        return total + report.file.size;
      } else if (report.documentData?.fileSize) {
        return total + report.documentData.fileSize;
      }
      return total;
    }, 0);
  };

  const getReportTypeLabel = (type: string) => {
    const labels = {
      home: 'Home Inspection',
      pool: 'Pool Inspection',
      chimney: 'Chimney Inspection',
      sewer: 'Sewer Inspection',
      pest: 'Pest Inspection',
      other: 'Other Inspection'
    };
    return labels[type as keyof typeof labels] || 'Inspection';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="h-5 w-5 text-[#5C1B10]" />
            Confirm Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Reports Summary */}
          <div>
            <p className="text-sm text-gray-600 mb-3">
              You&apos;re about to analyze {reports.length} report{reports.length !== 1 ? 's' : ''}:
            </p>
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{report.name}</p>
                    <p className="text-xs text-gray-500">
                      {getReportTypeLabel(report.type)} • {formatFileSize(report.file?.size || report.documentData?.fileSize)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notice */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-amber-900">Important:</p>
                  <ul className="space-y-1 text-amber-800">
                    <li className="flex items-center gap-2">
                      <CreditCard className="h-3 w-3" />
                      This will use 1 analysis credit
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      Analysis cannot be undone
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      Results will be saved for future use
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Estimated processing time: 2-3 minutes</span>
          </div>

          {/* Credits Remaining */}
          {remainingCredits !== undefined && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                You have <span className="font-semibold">{remainingCredits}</span> analysis credit{remainingCredits !== 1 ? 's' : ''} remaining this month
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isAnalyzing}
              className="flex-1"
            >
              Go Back
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isAnalyzing}
              className="flex-1 bg-[#5C1B10] hover:bg-[#4A1508] text-white"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin mr-2">⚡</span>
                  Starting Analysis...
                </>
              ) : (
                <>Start Analysis</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}