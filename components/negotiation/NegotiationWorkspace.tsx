"use client";

import { useState, useEffect } from "react";
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
  Flame
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

export function NegotiationWorkspace({
  reports,
  totalEstimatedCredits
}: NegotiationWorkspaceProps) {
  const [prioritizedIssues, setPrioritizedIssues] = useState<PrioritizedIssue[]>([]);
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

  const getLeverageColor = (score: number) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 6) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getLeverageIcon = (score: number) => {
    if (score >= 8) return <Flame className="h-3 w-3" />;
    if (score >= 6) return <AlertTriangle className="h-3 w-3" />;
    if (score >= 4) return <TrendingUp className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  const getSeverityIcon = (severity: PrioritizedIssue['severity']) => {
    switch (severity) {
      case 'safety':
        return <Shield className="h-3 w-3 text-red-600" />;
      case 'major':
        return <AlertTriangle className="h-3 w-3 text-orange-600" />;
      case 'minor':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      default:
        return <CheckCircle className="h-3 w-3 text-gray-600" />;
    }
  };

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

  const reportType = reports[0]?.type || 'inspection';
  const marketConditions = NegotiationAnalysisService.getDefaultMarketConditions();

  // Sidebar content component (shared between desktop and mobile)
  const SidebarContent = () => (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="h-4 w-4" />
        Select Issues to Negotiate
      </h3>
      
      {/* Issue List */}
      <div className="space-y-2">
        {prioritizedIssues.map((issue, index) => {
          const isEnabled = enabledIssues.has(issue.id);
          
          return (
            <div
              key={issue.id}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                isEnabled 
                  ? 'border-[#5C1B10] bg-[#5C1B10]/5' 
                  : 'border-gray-200 bg-gray-50/50'
              }`}
              onClick={() => {
                handleIssueToggle(issue.id);
                // Close mobile sheet after selection on mobile
                if (window.innerWidth < 1024) {
                  setMobileSheetOpen(false);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => {}}
                  className="mt-1 rounded border-gray-300 text-[#5C1B10] focus:ring-[#5C1B10]"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getSeverityIcon(issue.severity)}
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {issue.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate mb-2">
                    {issue.location}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {getLeverageIcon(issue.leverageScore)}
                      <span className={`text-xs font-medium ${getLeverageColor(issue.leverageScore)}`}>
                        {issue.leverageScore}/10
                      </span>
                    </div>
                    <span className="font-medium text-sm text-gray-900">
                      {formatCurrency(issue.negotiationValue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Selected Issues</span>
          <span className="font-medium">{enabledIssues.size}/{prioritizedIssues.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Value</span>
          <span className="font-bold text-lg text-[#5C1B10]">
            {formatCurrency(
              prioritizedIssues
                .filter(issue => enabledIssues.has(issue.id))
                .reduce((sum, issue) => sum + issue.negotiationValue, 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Persistent Header */}
      <div className="bg-[#5C1B10] text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div>
              <h2 className="text-xl font-bold">Negotiation Workspace</h2>
              <p className="text-sm text-white/80">
                {prioritizedIssues.length} issues • {reports.length} report{reports.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="text-right">
              <p className="text-xs sm:text-sm text-white/70">Current Ask</p>
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(currentTotalAsk)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm text-white/70">Success Rate</p>
              <p className="text-lg sm:text-2xl font-bold">{currentSuccessRate}%</p>
            </div>
            <Button variant="secondary" size="sm" className="ml-2 sm:ml-4 hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex h-[calc(100vh-200px)] bg-gray-50 rounded-b-lg overflow-hidden">
        {/* Desktop Sidebar */}
        <div className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden flex-shrink-0 hidden lg:block`}>
          <SidebarContent />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-white px-2 sm:px-4">
              <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Strategy Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="calculator" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Calculator className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Scenario Calculator</span>
                <span className="sm:hidden">Calculator</span>
              </TabsTrigger>
              <TabsTrigger value="scripts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Scripts & Talking Points</span>
                <span className="sm:hidden">Scripts</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50">
              <TabsContent value="overview" className="mt-0 h-full">
                <ExecutiveDashboard 
                  summary={executiveSummary} 
                  reportType={reportType}
                />
              </TabsContent>
              
              <TabsContent value="calculator" className="mt-0 h-full">
                <ScenarioPlanner 
                  issues={prioritizedIssues}
                  enabledIssues={enabledIssues}
                  totalAsk={currentTotalAsk}
                  marketConditions={marketConditions}
                  onStrategyChange={handleStrategyChange}
                />
              </TabsContent>
              
              <TabsContent value="scripts" className="mt-0 h-full">
                <NegotiationScripts 
                  issues={prioritizedIssues.filter(issue => enabledIssues.has(issue.id))}
                  enabledIssues={enabledIssues}
                  totalAsk={currentTotalAsk}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Mobile Sheet Trigger */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="lg:hidden fixed bottom-4 left-4 z-50 bg-[#5C1B10] text-white hover:bg-[#4A1508] shadow-lg"
          >
            <Menu className="h-5 w-5 mr-2" />
            Issues ({enabledIssues.size})
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}