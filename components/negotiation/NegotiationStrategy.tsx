"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Target, 
  AlertTriangle,
  TrendingUp,
  Download,
  Share,
  Clock,
  CheckCircle,
  BarChart3
} from "lucide-react";

// Import our new feature components
import { ExecutiveDashboard, ExecutiveSummary } from "./ExecutiveDashboard";
import { IssuePrioritization, PrioritizedIssue } from "./IssuePrioritization";
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

interface NegotiationStrategyProps {
  reports: UploadedReport[];
  totalEstimatedCredits: number;
}

export function NegotiationStrategy({
  reports,
  totalEstimatedCredits
}: NegotiationStrategyProps) {
  const [prioritizedIssues, setPrioritizedIssues] = useState<PrioritizedIssue[]>([]);
  const [enabledIssues, setEnabledIssues] = useState<Set<string>>(new Set());
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [currentTotalAsk, setCurrentTotalAsk] = useState(totalEstimatedCredits);

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
    }
  }, [reports]);

  const handleIssueToggle = (issueId: string, enabled: boolean) => {
    const newEnabledIssues = new Set(enabledIssues);
    if (enabled) {
      newEnabledIssues.add(issueId);
    } else {
      newEnabledIssues.delete(issueId);
    }
    setEnabledIssues(newEnabledIssues);
    
    // Recalculate total ask
    const newTotal = prioritizedIssues
      .filter(issue => newEnabledIssues.has(issue.id))
      .reduce((sum, issue) => sum + issue.negotiationValue, 0);
    setCurrentTotalAsk(newTotal);
  };

  const handleStrategyChange = (newAsk: number, newEnabledIssues: Set<string>) => {
    setCurrentTotalAsk(newAsk);
    setEnabledIssues(newEnabledIssues);
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

  return (
    <div className="space-y-8">
      {/* Feature 1: Executive Dashboard */}
      <ExecutiveDashboard 
        summary={executiveSummary} 
        reportType={reportType}
        selectedView="consolidated"
        currentReport={reports}
      />

      {/* Feature 2: Issue Prioritization Matrix */}
      <IssuePrioritization 
        issues={prioritizedIssues}
        onIssueToggle={handleIssueToggle}
        enabledIssues={enabledIssues}
      />

      {/* Feature 3: Negotiation Script Generator */}
      <NegotiationScripts 
        issues={prioritizedIssues.filter(issue => enabledIssues.has(issue.id))}
        enabledIssues={enabledIssues}
        totalAsk={currentTotalAsk}
      />

      {/* Feature 4: Interactive Scenario Planner */}
      <ScenarioPlanner 
        issues={prioritizedIssues}
        enabledIssues={enabledIssues}
        totalAsk={currentTotalAsk}
        marketConditions={marketConditions}
        onStrategyChange={handleStrategyChange}
      />

      {/* Download/Share Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Export Your Strategy</h3>
              <p className="text-sm text-gray-600">
                Download a comprehensive negotiation package or share with your agent
              </p>
            </div>
            <div className="flex space-x-3">
              <Button className="bg-[#5C1B10] hover:bg-[#4A1508] text-white">
                <Download className="h-4 w-4 mr-2" />
                Download Package
              </Button>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Share className="h-4 w-4 mr-2" />
                Share with Agent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}