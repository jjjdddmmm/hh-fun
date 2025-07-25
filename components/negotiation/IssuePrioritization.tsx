"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  DollarSign,
  Target,
  Clock,
  TrendingUp,
  Shield,
  Info,
  Flame
} from "lucide-react";

export interface PrioritizedIssue {
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
  leverageScore: number; // 1-10 scale
  successRate: number; // 0-100 percentage
  timelineImpact: 'delays_closing' | 'no_impact' | 'optional';
  dropPriority: 'never' | 'last' | 'first';
  evidence: string[];
  whatToSay: string;
  alternatives: string[];
}

interface IssuePrioritizationProps {
  issues: PrioritizedIssue[];
  onIssueToggle?: (issueId: string, enabled: boolean) => void;
  enabledIssues?: Set<string>;
}

export function IssuePrioritization({ 
  issues, 
  onIssueToggle,
  enabledIssues = new Set(issues.map(i => i.id))
}: IssuePrioritizationProps) {
  
  const getLeverageColor = (score: number) => {
    if (score >= 8) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 6) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getLeverageIcon = (score: number) => {
    if (score >= 8) return <Flame className="h-4 w-4" />;
    if (score >= 6) return <AlertTriangle className="h-4 w-4" />;
    if (score >= 4) return <TrendingUp className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  const getDropPriorityColor = (priority: PrioritizedIssue['dropPriority']) => {
    switch (priority) {
      case 'never':
        return 'bg-red-100 text-red-800';
      case 'last':
        return 'bg-yellow-100 text-yellow-800';
      case 'first':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: PrioritizedIssue['severity']) => {
    switch (severity) {
      case 'safety':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'major':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'minor':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cosmetic':
        return <Info className="h-4 w-4 text-gray-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sort issues by leverage score (highest first)
  const sortedIssues = [...issues].sort((a, b) => b.leverageScore - a.leverageScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#5C1B10]" />
          Issue Prioritization Matrix
        </CardTitle>
        <p className="text-gray-600">
          Focus your negotiation on high-leverage issues. Click to include/exclude from your ask.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedIssues.map((issue, index) => {
            const isEnabled = enabledIssues.has(issue.id);
            
            return (
              <div 
                key={issue.id}
                className={`border rounded-lg transition-all duration-200 ${
                  isEnabled 
                    ? 'border-[#5C1B10] bg-white' 
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(issue.severity)}
                        <span className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                          ${index < 3 ? 'bg-red-100 text-red-800' : 
                            index < 6 ? 'bg-orange-100 text-orange-800' : 
                            'bg-yellow-100 text-yellow-800'}
                        `}>
                          {index + 1}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {issue.category}
                          </h3>
                          <Badge className={getLeverageColor(issue.leverageScore)}>
                            <div className="flex items-center gap-1">
                              {getLeverageIcon(issue.leverageScore)}
                              <span className="font-medium">
                                {issue.leverageScore >= 8 ? 'HIGH' : 
                                 issue.leverageScore >= 6 ? 'STRONG' :
                                 issue.leverageScore >= 4 ? 'MODERATE' : 'WEAK'} leverage
                              </span>
                            </div>
                          </Badge>
                          <Badge className={getDropPriorityColor(issue.dropPriority)}>
                            {issue.dropPriority === 'never' ? 'MUST KEEP' :
                             issue.dropPriority === 'last' ? 'KEEP IF POSSIBLE' :
                             'OK TO DROP'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {issue.description} • {issue.location}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-gray-500" />
                            <span className="font-medium">
                              {formatCurrency(issue.negotiationValue)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-gray-500" />
                            <span>{issue.successRate}% success rate</span>
                          </div>
                          {issue.timelineImpact === 'delays_closing' && (
                            <div className="flex items-center gap-1 text-red-600">
                              <Clock className="h-3 w-3" />
                              <span className="font-medium">May delay closing</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(issue.negotiationValue)}
                        </p>
                      </div>
                      <Button
                        variant={isEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => onIssueToggle?.(issue.id, !isEnabled)}
                        className={isEnabled 
                          ? "bg-[#5C1B10] hover:bg-[#4A1508]" 
                          : "border-gray-300 hover:bg-gray-50"
                        }
                      >
                        {isEnabled ? 'Included' : 'Add Back'}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isEnabled && (
                    <div className="border-t pt-3 mt-3 space-y-3">
                      {/* What to Say */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-medium text-blue-900 mb-2">What to Say:</h4>
                        <p className="text-sm text-blue-800 italic">
                          &quot;{issue.whatToSay}&quot;
                        </p>
                      </div>

                      {/* Supporting Evidence */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Supporting Evidence:</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {issue.evidence.map((evidence, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-gray-400 mt-0.5">•</span>
                              {evidence}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Alternatives */}
                      {issue.alternatives.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Alternative Approaches:</h4>
                          <div className="flex flex-wrap gap-2">
                            {issue.alternatives.map((alt, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {alt}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {enabledIssues.size} of {issues.length} issues selected
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Ask</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(
                  issues
                    .filter(issue => enabledIssues.has(issue.id))
                    .reduce((sum, issue) => sum + issue.negotiationValue, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}