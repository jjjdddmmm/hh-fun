"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  FileText, 
  AlertTriangle, 
  DollarSign,
  Clock,
  Cpu,
  Hash,
  FileSearch,
  Eye
} from "lucide-react";

export interface AnalysisDetails {
  documentName: string;
  documentType: string;
  analysisTimestamp: string;
  issues: {
    id: string;
    category: string;
    severity: 'safety' | 'major' | 'minor' | 'cosmetic';
    description: string;
    location: string;
    estimatedCost: {
      low: number;
      high: number;
      average: number;
    };
    negotiationValue: number;
    confidence?: number;
    sourceText?: string;
    reasoning?: string;
  }[];
  summary: {
    totalIssues: number;
    totalEstimatedCost: number;
    issuesBySeverity: {
      safety: number;
      major: number;
      minor: number;
      cosmetic: number;
    };
  };
  // Debug/audit information
  debug?: {
    extractedText?: string;
    processingTime?: number;
    tokensUsed?: number;
    modelUsed?: string;
    apiCalls?: number;
    rawResponse?: any;
  };
}

interface AnalysisDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisDetails: AnalysisDetails | null;
  reportName: string;
  isDebugMode?: boolean;
}

export function AnalysisDetailsModal({
  isOpen,
  onClose,
  analysisDetails,
  reportName,
  isDebugMode = false
}: AnalysisDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("issues");

  if (!analysisDetails) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'safety':
        return 'bg-red-100 text-red-800';
      case 'major':
        return 'bg-orange-100 text-orange-800';
      case 'minor':
        return 'bg-yellow-100 text-yellow-800';
      case 'cosmetic':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'safety':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'major':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'minor':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportAnalysis = () => {
    if (!analysisDetails) {
      console.error('No analysis details available for export');
      alert('No analysis data available to export');
      return;
    }

    try {
      const exportData = {
        reportName,
        exportDate: new Date().toISOString(),
        analysis: analysisDetails,
        version: "1.0"
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, '_')}_analysis_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Export successful:', exportData);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Analysis Details: {reportName}</span>
            <Button variant="outline" size="sm" onClick={exportAnalysis}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of the inspection report analysis
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className={`grid w-full ${isDebugMode ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
            <TabsTrigger value="issues">Issues Found</TabsTrigger>
            <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
            {isDebugMode && (
              <>
                <TabsTrigger value="source">Source Text</TabsTrigger>
                <TabsTrigger value="debug">Debug Info</TabsTrigger>
              </>
            )}
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {/* Issues Found Tab */}
            <TabsContent value="issues" className="space-y-4">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{analysisDetails.summary.totalIssues}</p>
                        <p className="text-sm text-gray-600">Total Issues</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {Object.entries(analysisDetails.summary.issuesBySeverity).map(([severity, count]) => (
                  <Card key={severity}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(severity)}
                        <div>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-sm text-gray-600 capitalize">{severity}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-3">
                {analysisDetails.issues.map((issue, index) => (
                  <Card key={issue.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          {getSeverityIcon(issue.severity)}
                          <div>
                            <h3 className="font-semibold">{issue.category}</h3>
                            <p className="text-sm text-gray-600">{issue.location}</p>
                          </div>
                        </div>
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-3">{issue.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            Est. Cost: {formatCurrency(issue.estimatedCost.low)} - {formatCurrency(issue.estimatedCost.high)}
                          </span>
                          <span className="font-medium text-[#5C1B10]">
                            Negotiate: {formatCurrency(issue.negotiationValue)}
                          </span>
                        </div>
                        {isDebugMode && issue.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(issue.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>

                      {isDebugMode && issue.sourceText && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <p className="font-medium mb-1">Source text:</p>
                          <p className="italic">&quot;{issue.sourceText}&quot;</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Cost Breakdown Tab */}
            <TabsContent value="breakdown" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Estimated Costs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#5C1B10] mb-6">
                    {formatCurrency(analysisDetails.summary.totalEstimatedCost)}
                  </div>

                  <div className="space-y-4">
                    {Object.entries(analysisDetails.summary.issuesBySeverity).map(([severity, count]) => {
                      const severityIssues = analysisDetails.issues.filter(i => i.severity === severity);
                      const severityTotal = severityIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
                      const percentage = (severityTotal / analysisDetails.summary.totalEstimatedCost) * 100;

                      return (
                        <div key={severity}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(severity)}
                              <span className="font-medium capitalize">{severity} Issues ({count})</span>
                            </div>
                            <span className="font-bold">{formatCurrency(severityTotal)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                severity === 'safety' ? 'bg-red-600' :
                                severity === 'major' ? 'bg-orange-600' :
                                severity === 'minor' ? 'bg-yellow-600' :
                                'bg-gray-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{percentage.toFixed(1)}% of total</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3">Cost Distribution</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600 mb-1">Average per Issue</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(analysisDetails.summary.totalEstimatedCost / analysisDetails.summary.totalIssues)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600 mb-1">Highest Single Issue</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(Math.max(...analysisDetails.issues.map(i => i.negotiationValue)))}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Debug Mode Tabs */}
            {isDebugMode && analysisDetails.debug && (
              <>
                {/* Source Text Tab */}
                <TabsContent value="source" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileSearch className="h-5 w-5" />
                        Extracted Text from PDF
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] w-full rounded border p-4">
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                          {analysisDetails.debug.extractedText || "No text extracted"}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Debug Info Tab */}
                <TabsContent value="debug" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Processing Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            Processing Time
                          </span>
                          <span className="font-medium">
                            {analysisDetails.debug.processingTime ? `${analysisDetails.debug.processingTime}ms` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <Hash className="h-4 w-4" />
                            Tokens Used
                          </span>
                          <span className="font-medium">
                            {analysisDetails.debug.tokensUsed || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <Cpu className="h-4 w-4" />
                            Model Used
                          </span>
                          <span className="font-medium text-xs">
                            {analysisDetails.debug.modelUsed || 'claude-3'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Analysis Metadata</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Document Type</span>
                          <span className="font-medium">{analysisDetails.documentType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Analysis Date</span>
                          <span className="font-medium text-xs">
                            {new Date(analysisDetails.analysisTimestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">API Calls</span>
                          <span className="font-medium">{analysisDetails.debug.apiCalls || 1}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {analysisDetails.debug.rawResponse && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Raw API Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px] w-full rounded border p-4">
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                            {JSON.stringify(analysisDetails.debug.rawResponse, null, 2)}
                          </pre>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}