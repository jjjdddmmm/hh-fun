"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  DollarSign, 
  Target, 
  AlertTriangle,
  TrendingUp,
  Download,
  Menu,
  X,
  Calculator,
  FileText,
  BarChart3,
  CheckCircle,
  Shield,
  Clock,
  Flame,
  ArrowLeft,
  ChevronRight,
  FileSearch,
  Home,
  Droplets,
  Home as ChimneyIcon,
  Bug
} from "lucide-react";

// Import our feature components
import { ExecutiveDashboard, ExecutiveSummary } from "./ExecutiveDashboard";
import { PrioritizedIssue } from "./IssuePrioritization";
import { NegotiationScripts } from "./NegotiationScripts";
import { ScenarioPlanner } from "./ScenarioPlanner";
import { NegotiationAnalysisService } from "@/lib/services/negotiation/NegotiationAnalysisService";

interface UploadedReport {
  id: string;
  name: string;
  type: 'home' | 'pool' | 'chimney' | 'sewer' | 'pest' | 'other';
  file?: File;
  documentData?: any;
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'error';
  issues?: any[];
}

interface NegotiationWorkspaceProps {
  reports: UploadedReport[];
  totalEstimatedCredits: number;
}

// Helper function to get report icon
const getReportIcon = (type: string) => {
  switch (type) {
    case 'home':
      return <Home className="h-4 w-4" />;
    case 'pool':
      return <Droplets className="h-4 w-4" />;
    case 'chimney':
      return <ChimneyIcon className="h-4 w-4" />;
    case 'sewer':
      return <Droplets className="h-4 w-4" />;
    case 'pest':
      return <Bug className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// Helper function to get report type label
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

export function NegotiationWorkspace({
  reports,
  totalEstimatedCredits
}: NegotiationWorkspaceProps) {
  const router = useRouter();
  const [selectedView, setSelectedView] = useState<'consolidated' | string>('consolidated');
  const [prioritizedIssues, setPrioritizedIssues] = useState<PrioritizedIssue[]>([]);
  const [reportIssuesMap, setReportIssuesMap] = useState<Map<string, PrioritizedIssue[]>>(new Map());
  const [enabledIssues, setEnabledIssues] = useState<Set<string>>(new Set());
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [currentTotalAsk, setCurrentTotalAsk] = useState(totalEstimatedCredits);
  const [currentSuccessRate, setCurrentSuccessRate] = useState(70);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Transform raw issues into prioritized negotiation data
  useEffect(() => {
    const allRawIssues = reports.flatMap(r => r.issues || []);
    
    if (allRawIssues.length > 0) {
      // Convert to our prioritized format
      const prioritized = NegotiationAnalysisService.prioritizeIssues(allRawIssues);
      setPrioritizedIssues(prioritized);
      
      // Create report-specific issue maps
      const reportMap = new Map<string, PrioritizedIssue[]>();
      reports.forEach(report => {
        if (report.issues) {
          const reportPrioritized = NegotiationAnalysisService.prioritizeIssues(report.issues);
          reportMap.set(report.id, reportPrioritized);
        }
      });
      setReportIssuesMap(reportMap);
      
      // Initially enable all issues
      const allIssueIds = new Set(prioritized.map(issue => issue.id));
      setEnabledIssues(allIssueIds);
      
      // Generate executive summary
      const reportType = reports[0]?.type || 'inspection';
      const marketConditions = NegotiationAnalysisService.getDefaultMarketConditions();
      const summary = NegotiationAnalysisService.generateExecutiveSummary(
        prioritized,
        reportType,
        marketConditions
      );
      setExecutiveSummary(summary);
      setCurrentTotalAsk(summary.recommendedAsk);
      setCurrentSuccessRate(summary.successRate);
    }
  }, [reports]);

  const handleIssueToggle = (issueId: string) => {
    const newEnabledIssues = new Set(enabledIssues);
    if (newEnabledIssues.has(issueId)) {
      newEnabledIssues.delete(issueId);
    } else {
      newEnabledIssues.add(issueId);
    }
    setEnabledIssues(newEnabledIssues);
    
    // Recalculate totals
    const newTotal = prioritizedIssues
      .filter(issue => newEnabledIssues.has(issue.id))
      .reduce((sum, issue) => sum + issue.negotiationValue, 0);
    setCurrentTotalAsk(newTotal);
    
    // Recalculate success rate
    const enabledIssuesList = prioritizedIssues.filter(issue => newEnabledIssues.has(issue.id));
    if (enabledIssuesList.length > 0) {
      const avgLeverageScore = enabledIssuesList.reduce((sum, issue) => sum + issue.leverageScore, 0) / enabledIssuesList.length;
      let newSuccessRate = 70;
      if (avgLeverageScore >= 8) newSuccessRate = 85;
      else if (avgLeverageScore >= 6) newSuccessRate = 75;
      else if (avgLeverageScore >= 4) newSuccessRate = 65;
      else newSuccessRate = 50;
      setCurrentSuccessRate(newSuccessRate);
    }
  };

  const handleStrategyChange = (newAsk: number, newEnabledIssues: Set<string>) => {
    setCurrentTotalAsk(newAsk);
    setEnabledIssues(newEnabledIssues);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleBackToAnalysis = () => {
    // Navigate back to analysis view
    router.push('/negotiation');
  };

  // Get current view's issues and data
  const getCurrentViewData = () => {
    if (selectedView === 'consolidated') {
      return {
        title: 'Consolidated Overview',
        subtitle: `${reports.length} reports analyzed`,
        issues: prioritizedIssues,
        reportType: 'multiple' as const,
        summary: executiveSummary,
        report: null
      };
    } else {
      const report = reports.find(r => r.id === selectedView);
      const reportIssues = reportIssuesMap.get(selectedView) || [];
      
      
      // Generate report-specific executive summary
      const reportSummary = report && reportIssues.length > 0 ? 
        NegotiationAnalysisService.generateExecutiveSummary(
          reportIssues,
          report.type,
          NegotiationAnalysisService.getDefaultMarketConditions()
        ) : executiveSummary;
      
      return {
        title: getReportTypeLabel(report?.type || 'other'),
        subtitle: report?.name || 'Report',
        issues: reportIssues,
        reportType: report?.type || 'inspection',
        summary: reportSummary,
        report: report || null
      };
    }
  };

  const currentViewData = getCurrentViewData();

  // Show loading state while data is being processed
  if (!executiveSummary || prioritizedIssues.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <BarChart3 className="h-8 w-8 animate-pulse text-[#5C1B10]" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">Generating Your Negotiation Strategy</p>
              <p className="text-gray-600">Analyzing issues and calculating optimal negotiation approach...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const marketConditions = NegotiationAnalysisService.getDefaultMarketConditions();

  // Sidebar content component (shared between desktop and mobile)
  const SidebarContent = () => (
    <div className="h-full overflow-y-auto">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileSearch className="h-4 w-4" />
          Analysis Results
        </h3>
      </div>
      
      {/* Report List */}
      <div className="p-4 space-y-2">
        {/* Consolidated Overview */}
        <div
          className={`
            flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
            ${selectedView === 'consolidated' 
              ? 'bg-[#5C1B10] text-white' 
              : 'hover:bg-gray-100'
            }
          `}
          onClick={() => {
            setSelectedView('consolidated');
            if (window.innerWidth < 1024) {
              setMobileSheetOpen(false);
            }
          }}
        >
          <BarChart3 className={`h-5 w-5 ${selectedView === 'consolidated' ? 'text-white' : 'text-gray-600'}`} />
          <div className="flex-1">
            <p className="font-medium">Consolidated Overview</p>
            <p className={`text-xs ${selectedView === 'consolidated' ? 'text-white/80' : 'text-gray-500'}`}>
              All {reports.length} reports • {formatCurrency(totalEstimatedCredits)}
            </p>
          </div>
          <ChevronRight className={`h-4 w-4 ${selectedView === 'consolidated' ? 'text-white' : 'text-gray-400'}`} />
        </div>

        {/* Separator */}
        <div className="py-2">
          <div className="h-px bg-gray-200"></div>
        </div>

        {/* Individual Reports */}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1">Individual Reports</p>
        {reports.map((report) => {
          const reportIssues = reportIssuesMap.get(report.id) || [];
          const reportTotal = reportIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
          
          return (
            <div
              key={report.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${selectedView === report.id 
                  ? 'bg-[#5C1B10] text-white' 
                  : 'hover:bg-gray-100'
                }
              `}
              onClick={() => {
                setSelectedView(report.id);
                if (window.innerWidth < 1024) {
                  setMobileSheetOpen(false);
                }
              }}
            >
              <div className={`${selectedView === report.id ? 'text-white' : 'text-gray-600'}`}>
                {getReportIcon(report.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{report.name}</p>
                <p className={`text-xs ${selectedView === report.id ? 'text-white/80' : 'text-gray-500'}`}>
                  {reportIssues.length} issues • {formatCurrency(reportTotal)}
                </p>
              </div>
              <ChevronRight className={`h-4 w-4 flex-shrink-0 ${selectedView === report.id ? 'text-white' : 'text-gray-400'}`} />
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Issues</span>
            <span className="font-medium">{prioritizedIssues.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Credits</span>
            <span className="font-bold text-lg text-[#5C1B10]">
              {formatCurrency(totalEstimatedCredits)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToAnalysis}
          className="hover:bg-gray-100 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analysis
        </Button>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900">Negotiation Strategy</span>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-[#5C1B10] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex text-white hover:bg-white/10 -ml-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div>
                <CardTitle className="text-xl text-white">{currentViewData.title}</CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  {currentViewData.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-white/70">Recommended Ask</p>
                <p className="text-2xl font-bold">{formatCurrency(currentTotalAsk)}</p>
              </div>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Main Layout Container */}
        <div className="flex h-[calc(100vh-300px)] bg-gray-50 overflow-hidden">
          {/* Desktop Sidebar */}
          <div className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden flex-shrink-0 hidden lg:flex flex-col`}>
            <SidebarContent />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b bg-white px-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Strategy Overview
                </TabsTrigger>
                <TabsTrigger value="calculator" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Scenario Calculator
                </TabsTrigger>
                <TabsTrigger value="scripts" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Scripts & Talking Points
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                <TabsContent value="overview" className="mt-0 h-full">
                  <ExecutiveDashboard 
                    summary={currentViewData.summary || executiveSummary!} 
                    reportType={currentViewData.reportType}
                    selectedView={selectedView}
                    currentReport={currentViewData.report}
                  />
                </TabsContent>
                
                <TabsContent value="calculator" className="mt-0 h-full">
                  <ScenarioPlanner 
                    issues={currentViewData.issues}
                    enabledIssues={enabledIssues}
                    totalAsk={selectedView === 'consolidated' ? currentTotalAsk : currentViewData.issues.reduce((sum, issue) => sum + (enabledIssues.has(issue.id) ? issue.negotiationValue : 0), 0)}
                    marketConditions={marketConditions}
                    onStrategyChange={handleStrategyChange}
                  />
                </TabsContent>
                
                <TabsContent value="scripts" className="mt-0 h-full">
                  <NegotiationScripts 
                    issues={currentViewData.issues.filter(issue => enabledIssues.has(issue.id))}
                    enabledIssues={enabledIssues}
                    totalAsk={selectedView === 'consolidated' ? currentTotalAsk : currentViewData.issues.reduce((sum, issue) => sum + (enabledIssues.has(issue.id) ? issue.negotiationValue : 0), 0)}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </Card>

      {/* Mobile Sheet Trigger */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="lg:hidden fixed bottom-4 left-4 z-50 bg-[#5C1B10] text-white hover:bg-[#4A1508] shadow-lg"
          >
            <Menu className="h-5 w-5 mr-2" />
            Reports
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}