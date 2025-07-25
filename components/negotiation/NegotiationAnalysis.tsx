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
  Eye,
  DollarSign,
  Target
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
    <div className="space-y-8">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent font-bold">
                AI Analysis Progress
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 font-medium">Claude Opus 4 Active</span>
              </div>
            </div>
          </CardTitle>
          <p className="text-gray-700 leading-relaxed">
            Our advanced AI is extracting issues, estimating costs, and calculating negotiation values from your inspection reports
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-6 border-2 border-gray-100 rounded-xl hover:border-gray-200 transition-all duration-300 hover:shadow-lg bg-white/70 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(report.analysisStatus)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{report.name}</h3>
                    <p className="text-sm text-gray-600 capitalize font-medium">{report.type} inspection report</p>
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
                            className="group text-xs bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-semibold hover:scale-105"
                            title="Click to view detailed analysis"
                          >
                            <Eye className="h-3 w-3 group-hover:scale-110 transition-transform" />
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
                  <Badge className={`${getStatusColor(report.analysisStatus)} px-3 py-1 text-xs font-semibold transition-all duration-300`}>
                    {getStatusText(report.analysisStatus)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between items-center p-6 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border">
            <div className="text-sm">
              {hasStarted ? (
                <span className="font-medium text-gray-700">
                  {reports.filter(r => r.analysisStatus === 'complete').length} of {reports.length} reports analyzed
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">
                    {reports.length} report{reports.length !== 1 ? 's' : ''} ready for analysis
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              {!hasStarted && (
                <Button
                  onClick={onStartAnalysis}
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-[#5C1B10] to-[#8B2635] hover:from-[#4A1508] hover:to-[#7A1E2B] text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2.5 font-semibold"
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
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2.5 font-semibold group"
                >
                  View Negotiation Strategy
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Details */}
      {hasStarted && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-purple-50/20 to-blue-50/30">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
              What Our AI Is Analyzing
            </CardTitle>
            <p className="text-gray-600 mt-2">Powered by Claude Opus 4 - the most advanced AI model for inspection analysis</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <AlertTriangle className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">Issue Identification</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Advanced pattern recognition extracts and categorizes all reported issues by severity, urgency, and repair complexity
                </p>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">Cost Estimation</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Real-time market analysis calculates accurate repair costs using current contractor rates and material prices
                </p>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">Negotiation Strategy</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Strategic positioning determines optimal credit amounts based on market leverage and negotiation psychology
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