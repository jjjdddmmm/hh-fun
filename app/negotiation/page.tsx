// Inspection Report Credit Negotiation Tool
// Transform inspection reports into actionable negotiation strategies

"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/utils/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { 
  FileText, 
  Upload, 
  DollarSign, 
  Target, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
  Loader2
} from "lucide-react";
import { ReportUploadSection } from "@/components/negotiation/ReportUploadSection";
import { NegotiationAnalysis } from "@/components/negotiation/NegotiationAnalysis";
import { NegotiationWorkspace } from "@/components/negotiation/NegotiationWorkspace";
import AppNavigation from "@/components/app-navigation";
import AppFooter from "@/components/app-footer";

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
  issues?: InspectionIssue[];
  detailedAnalysis?: any; // Will contain the detailed analysis data for the modal
}

interface InspectionIssue {
  id: string;
  category: string;
  severity: 'safety' | 'major' | 'minor' | 'cosmetic';
  urgency: 'immediate' | '1-2-years' | 'long-term';
  description: string;
  location: string;
  estimatedCost: {
    low: number;
    high: number;
    professional: boolean;
  };
  negotiationValue: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export default function NegotiationPage() {
  const [reports, setReports] = useState<UploadedReport[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'analysis' | 'strategy'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [availableReports, setAvailableReports] = useState<InspectionDocument[]>([]);

  // Load existing inspection reports from database
  useEffect(() => {
    loadInspectionReports();
  }, []);

  const loadInspectionReports = async () => {
    try {
      setIsLoadingReports(true);
      const response = await fetch('/api/negotiation/inspection-reports');
      if (response.ok) {
        const reports = await response.json();
        setAvailableReports(reports);
        
        // If we have reports, automatically move to analysis or show selection
        if (reports.length > 0) {
          setCurrentStep('upload'); // Still show upload to let user select which reports
        }
      }
    } catch (error) {
      logger.error('Error loading inspection reports:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const stats = {
    totalReports: reports.length,
    totalIssues: reports.reduce((sum, report) => sum + (report.issues?.length || 0), 0),
    estimatedCredits: reports.reduce((sum, report) => 
      sum + (report.issues?.reduce((issueSum, issue) => issueSum + issue.negotiationValue, 0) || 0), 0
    ),
    completedAnalysis: reports.filter(r => r.analysisStatus === 'complete').length
  };

  const handleReportsUpload = (newReports: UploadedReport[]) => {
    // Don't add to existing reports - the ReportUploadSection already manages the reports state
    // This callback is just to move to the analysis step
    if (newReports.length > 0) {
      setCurrentStep('analysis');
    }
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setCurrentStep('analysis');
    
    // Process each report with real AI analysis
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      if (report.analysisStatus === 'pending') {
        try {
          // Update to analyzing
          setReports(prev => prev.map(r => 
            r.id === report.id ? { ...r, analysisStatus: 'analyzing' } : r
          ));
          
          let analysisResult;
          
          // Start with progressive issue discovery simulation
          const simulateProgressiveAnalysis = async (reportType: string, actualIssuesCount: number) => {
            // Get type-specific analysis messages
            const getAnalysisSteps = (reportType: string) => {
              if (reportType.includes('home') || reportType === 'home_general') {
                return [
                  { delay: 600, message: "Scanning electrical systems..." },
                  { delay: 1000, message: "Checking plumbing components..." },
                  { delay: 1400, message: "Analyzing HVAC system..." },
                  { delay: 1800, message: "Reviewing interior conditions..." }
                ];
              } else if (reportType.includes('chimney')) {
                return [
                  { delay: 700, message: "Inspecting chimney structure..." },
                  { delay: 1200, message: "Analyzing flue condition..." },
                  { delay: 1600, message: "Checking fireplace safety..." }
                ];
              } else if (reportType.includes('sewer')) {
                return [
                  { delay: 800, message: "Scanning sewer line..." },
                  { delay: 1300, message: "Checking for blockages..." },
                  { delay: 1700, message: "Analyzing pipe integrity..." }
                ];
              } else if (reportType.includes('pool')) {
                return [
                  { delay: 600, message: "Checking pool equipment..." },
                  { delay: 1100, message: "Analyzing water systems..." },
                  { delay: 1500, message: "Reviewing safety features..." }
                ];
              } else {
                return [
                  { delay: 700, message: "Analyzing report content..." },
                  { delay: 1200, message: "Identifying issues..." },
                  { delay: 1600, message: "Calculating costs..." }
                ];
              }
            };

            const steps = getAnalysisSteps(reportType);
            
            // Build progressive issue count that matches actual result
            const issueProgression: number[] = [];
            if (actualIssuesCount > 0) {
              // Create a realistic progression that ends at the actual count
              const stepCount = Math.min(steps.length, actualIssuesCount);
              for (let i = 1; i <= stepCount; i++) {
                const issueCount = Math.ceil((i / stepCount) * actualIssuesCount);
                issueProgression.push(issueCount);
              }
            }
            
            for (let i = 0; i < steps.length; i++) {
              await new Promise(resolve => setTimeout(resolve, steps[i].delay));
              
              // Update with progressive issue count and type-specific message
              setReports(prev => prev.map(r => 
                r.id === report.id 
                  ? { 
                      ...r, 
                      analysisStatus: 'analyzing',
                      tempIssueCount: issueProgression[i] || 0,
                      tempMessage: steps[i].message
                    }
                  : r
              ));
            }
          };
          
          // Get analysis result first to know the actual issue count
          if (report.file) {
            // Analyze uploaded file
            analysisResult = await analyzeUploadedFile(report.file, report.type);
          } else if (report.documentData) {
            // Analyze database document
            analysisResult = await analyzeDatabaseDocument(report.documentData, report.type);
          } else {
            throw new Error('No file or document data available for analysis');
          }
          
          // Start progressive simulation with actual issue count
          await simulateProgressiveAnalysis(report.type, analysisResult.issues?.length || 0);
          
          // Complete analysis with real AI results
          setReports(prev => prev.map(r => 
            r.id === report.id 
              ? { 
                  ...r, 
                  analysisStatus: 'complete', 
                  issues: analysisResult.issues || [],
                  detailedAnalysis: analysisResult.detailedAnalysis || null,
                  tempIssueCount: undefined,
                  tempMessage: undefined
                }
              : r
          ));
          
        } catch (error) {
          logger.error('Analysis failed for report:', error, { reportName: report.name });
          
          // Mark as error
          setReports(prev => prev.map(r => 
            r.id === report.id ? { ...r, analysisStatus: 'error' } : r
          ));
        }
      }
    }
    
    setIsAnalyzing(false);
    
    // Only proceed to strategy if at least one analysis completed
    const completedCount = reports.filter(r => r.analysisStatus === 'complete').length;
    if (completedCount > 0) {
      setCurrentStep('strategy');
    }
  };

  // Real AI analysis functions
  const analyzeUploadedFile = async (file: File, reportType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('reportType', reportType);
    
    const response = await fetch('/api/negotiation/analyze', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Analysis failed');
    }
    
    const result = await response.json();
    return result.analysis;
  };

  const analyzeDatabaseDocument = async (documentData: any, reportType: string) => {
    // Download the document from Cloudinary and analyze it
    const response = await fetch(documentData.downloadUrl);
    if (!response.ok) {
      throw new Error('Failed to download document');
    }
    
    const blob = await response.blob();
    const file = new File([blob], documentData.originalName, { type: 'application/pdf' });
    
    return await analyzeUploadedFile(file, reportType);
  };

  const generateMockIssues = (reportType: string): InspectionIssue[] => {
    // Fallback mock - should not be used with real AI
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <DollarSign className="h-4 w-4" />
          Negotiation
        </div>
        <SectionHeader className="text-4xl font-bold mb-3">
          Inspection Credit Negotiation
        </SectionHeader>
        <p className="text-gray-600 text-lg">
          Transform your inspection reports into data-backed negotiation strategies with specific credit amounts
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {[
            { key: 'upload', icon: Upload, label: 'Upload Reports', desc: 'Add inspection reports' },
            { key: 'analysis', icon: Calculator, label: 'AI Analysis', desc: 'Extract & cost issues' },
            { key: 'strategy', icon: Target, label: 'Negotiation Strategy', desc: 'Get your game plan' }
          ].map((step, index) => {
            const isActive = currentStep === step.key;
            const isCompleted = 
              (step.key === 'upload' && reports.length > 0) ||
              (step.key === 'analysis' && stats.completedAnalysis === stats.totalReports && stats.totalReports > 0) ||
              (step.key === 'strategy' && currentStep === 'strategy');
            
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors
                    ${isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-[#5C1B10] text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <step.icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`font-medium ${isActive ? 'text-[#5C1B10]' : 'text-gray-600'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
                
                {index < 2 && (
                  <div className={`
                    h-0.5 w-16 mx-4 transition-colors
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      {stats.totalReports > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalReports}</p>
                  <p className="text-sm text-gray-600 font-medium">Reports Uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg mr-4 group-hover:bg-orange-200 transition-colors">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalIssues}</p>
                  <p className="text-sm text-gray-600 font-medium">Issues Found</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg mr-4 group-hover:bg-green-200 transition-colors">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-700 mb-1">
                    ${stats.estimatedCredits.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Est. Credits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg mr-4 group-hover:bg-purple-200 transition-colors">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.totalReports > 0 ? Math.round((stats.completedAnalysis / stats.totalReports) * 100) : 0}%
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Analysis Complete</p>
                </div>
              </div>
              {stats.completedAnalysis === stats.totalReports && stats.totalReports > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-1 rounded-full w-full"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoadingReports ? (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-16">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-[#5C1B10] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-[#5C1B10]" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-gray-900">Loading Your Inspection Reports</p>
                <p className="text-gray-600 max-w-md">Fetching completed inspection documents from your timelines...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Main Content */
        <div className="space-y-8">
          {currentStep === 'upload' && (
            <ReportUploadSection 
              onReportsUpload={handleReportsUpload}
              reports={reports}
              setReports={setReports}
              availableReports={availableReports}
            />
          )}
        
        {currentStep === 'analysis' && (
          <NegotiationAnalysis
            reports={reports}
            setReports={setReports}
            isAnalyzing={isAnalyzing}
            onStartAnalysis={handleStartAnalysis}
            onProceedToStrategy={() => setCurrentStep('strategy')}
          />
        )}
        
          {currentStep === 'strategy' && (
            <NegotiationWorkspace
              reports={reports}
              totalEstimatedCredits={stats.estimatedCredits}
            />
          )}
        </div>
      )}
      </div>
      
      <AppFooter />
    </div>
  );
}