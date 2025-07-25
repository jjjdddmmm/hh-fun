"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalysisDetailsModal, AnalysisDetails } from "./AnalysisDetailsModal";
import { 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ArrowRight,
  Eye
} from "lucide-react";

interface UploadedReport {
  id: string;
  name: string;
  type: 'home' | 'pool' | 'chimney' | 'sewer' | 'pest' | 'other';
  file?: File;
  documentData?: any;
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'error';
  issues?: any[];
  detailedAnalysis?: AnalysisDetails;
  tempIssueCount?: number;
  tempMessage?: string;
}

interface NegotiationAnalysisProps {
  reports: UploadedReport[];
  setReports: (reports: UploadedReport[]) => void;
  isAnalyzing: boolean;
  onStartAnalysis: () => Promise<void>;
  onProceedToStrategy: () => void;
}

export function NegotiationAnalysis({
  reports,
  setReports,
  isAnalyzing,
  onStartAnalysis,
  onProceedToStrategy
}: NegotiationAnalysisProps) {
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisDetails | null>(null);
  const [selectedReportName, setSelectedReportName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if we're in debug mode - temporarily always enabled for testing
  const isDebugMode = true; // process.env.NODE_ENV === 'development' || 
    // (typeof window !== 'undefined' && window.location.search.includes('debug=true'));

  const handleViewAnalysis = (report: UploadedReport) => {
    if (report.detailedAnalysis) {
      setSelectedAnalysis(report.detailedAnalysis);
      setSelectedReportName(report.name);
      setIsModalOpen(true);
    }
  };
  const getStatusIcon = (status: UploadedReport['analysisStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" />;
      case 'analyzing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadedReport['analysisStatus']) => {
    switch (status) {
      case 'pending':
        return 'Waiting to analyze';
      case 'analyzing':
        return 'Analyzing issues...';
      case 'complete':
        return 'Analysis complete';
      case 'error':
        return 'Analysis failed';
    }
  };

  const getStatusColor = (status: UploadedReport['analysisStatus']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'analyzing':
        return 'bg-blue-100 text-blue-700';
      case 'complete':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
    }
  };

  const allComplete = reports.length > 0 && reports.every(r => r.analysisStatus === 'complete');
  const hasStarted = reports.some(r => r.analysisStatus !== 'pending');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            AI Analysis Progress
          </CardTitle>
          <p className="text-gray-600">
            Our AI is extracting issues, estimating costs, and calculating negotiation values from your inspection reports
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(report.analysisStatus)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{report.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{report.type} inspection report</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {(report.analysisStatus === 'complete' && report.issues) || (report.analysisStatus === 'analyzing' && report.tempIssueCount) ? (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {report.analysisStatus === 'complete' 
                          ? `${report.issues?.length || 0} issue${(report.issues?.length || 0) !== 1 ? 's' : ''} found`
                          : `${report.tempIssueCount || 0} issue${(report.tempIssueCount || 0) !== 1 ? 's' : ''} found...`
                        }
                      </p>
                      {report.analysisStatus === 'complete' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewAnalysis(report)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer flex items-center gap-1"
                            title="Click to view detailed analysis"
                          >
                            <Eye className="h-3 w-3" />
                            ${(report.issues || []).reduce((sum, issue) => sum + (issue.negotiationValue || 0), 0).toLocaleString()} potential credits
                          </button>
                        </div>
                      )}
                      {report.analysisStatus === 'analyzing' && report.tempMessage && (
                        <p className="text-xs text-blue-600 italic">
                          {report.tempMessage}
                        </p>
                      )}
                    </div>
                  ) : null}
                  <Badge className={getStatusColor(report.analysisStatus)}>
                    {getStatusText(report.analysisStatus)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {hasStarted ? (
                `${reports.filter(r => r.analysisStatus === 'complete').length} of ${reports.length} reports analyzed`
              ) : (
                `${reports.length} report${reports.length !== 1 ? 's' : ''} ready for analysis`
              )}
            </div>
            <div className="flex space-x-3">
              {!hasStarted && (
                <Button
                  onClick={onStartAnalysis}
                  disabled={isAnalyzing}
                  className="bg-[#5C1B10] hover:bg-[#4A1508] text-white"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Analysis...
                    </>
                  ) : (
                    'Start AI Analysis'
                  )}
                </Button>
              )}
              {allComplete && (
                <Button
                  onClick={onProceedToStrategy}
                  className="bg-[#5C1B10] hover:bg-[#4A1508] text-white"
                >
                  View Negotiation Strategy
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Details */}
      {hasStarted && (
        <Card>
          <CardHeader>
            <CardTitle>What Our AI Is Analyzing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Issue Identification</h3>
                <p className="text-sm text-gray-600">
                  Extracting and categorizing all reported issues by severity and urgency
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold text-lg">$</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Cost Estimation</h3>
                <p className="text-sm text-gray-600">
                  Calculating repair costs using local market data and current material prices
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ArrowRight className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Negotiation Value</h3>
                <p className="text-sm text-gray-600">
                  Determining realistic credit amounts based on market conditions and risk
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Details Modal */}
      <AnalysisDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        analysisDetails={selectedAnalysis}
        reportName={selectedReportName}
        isDebugMode={isDebugMode}
      />
    </div>
  );
}