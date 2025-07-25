"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  DollarSign,
  BarChart3,
  Lightbulb,
  RefreshCw
} from "lucide-react";
import { PrioritizedIssue } from "./IssuePrioritization";

interface ScenarioResult {
  totalAsk: number;
  successRate: number;
  expectedValue: number; // totalAsk * successRate
  negotiationStrength: 'weak' | 'moderate' | 'strong';
  marketAdjustment: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  alternatives: AlternativeStrategy[];
}

interface AlternativeStrategy {
  id: string;
  title: string;
  description: string;
  totalValue: number;
  successRate: number;
  pros: string[];
  cons: string[];
  bestFor: string;
}

interface MarketConditions {
  marketType: 'seller' | 'buyer' | 'balanced';
  seasonalFactor: number;
  localTrends: 'rising' | 'stable' | 'declining';
  competitionLevel: 'low' | 'medium' | 'high';
}

interface ScenarioPlannerProps {
  issues: PrioritizedIssue[];
  enabledIssues: Set<string>;
  totalAsk: number;
  marketConditions: MarketConditions;
  onStrategyChange?: (newAsk: number, enabledIssues: Set<string>) => void;
}

export function ScenarioPlanner({ 
  issues, 
  enabledIssues: initialEnabledIssues,
  totalAsk: initialTotalAsk,
  marketConditions,
  onStrategyChange
}: ScenarioPlannerProps) {
  const [askAmount, setAskAmount] = useState(initialTotalAsk);
  const [enabledIssues, setEnabledIssues] = useState(new Set(initialEnabledIssues));
  const [marketAdjustment, setMarketAdjustment] = useState(0);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateScenario = (amount: number, enabled: Set<string>, adjustment: number = 0): ScenarioResult => {
    const baseAmount = amount + adjustment;
    const enabledIssuesList = issues.filter(issue => enabled.has(issue.id));
    
    // Calculate success rate based on multiple factors
    let successRate = 70; // Base success rate
    
    // Adjust for issue quality
    const avgLeverageScore = enabledIssuesList.reduce((sum, issue) => sum + issue.leverageScore, 0) / enabledIssuesList.length;
    if (avgLeverageScore >= 8) successRate += 15;
    else if (avgLeverageScore >= 6) successRate += 5;
    else if (avgLeverageScore >= 4) successRate -= 5;
    else successRate -= 15;
    
    // Market adjustments
    if (marketConditions.marketType === 'buyer') successRate += 10;
    else if (marketConditions.marketType === 'seller') successRate -= 15;
    
    // Seasonal adjustment
    successRate += (marketConditions.seasonalFactor - 1) * 10;
    
    // Amount-based adjustment (higher asks = lower success)
    const originalTotal = issues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
    const askRatio = baseAmount / originalTotal;
    if (askRatio > 1.2) successRate -= 20;
    else if (askRatio > 1.1) successRate -= 10;
    else if (askRatio < 0.8) successRate += 10;
    
    // Safety issue bonus
    const safetyIssues = enabledIssuesList.filter(issue => issue.severity === 'safety');
    if (safetyIssues.length > 0) successRate += 5;
    
    // Critical issues that can't be dropped
    const criticalIssues = enabledIssuesList.filter(issue => issue.dropPriority === 'never');
    if (criticalIssues.length === enabledIssuesList.length) successRate -= 5; // Too rigid

    successRate = Math.max(10, Math.min(95, successRate));
    
    const expectedValue = baseAmount * (successRate / 100);
    
    let negotiationStrength: 'weak' | 'moderate' | 'strong';
    if (successRate >= 75) negotiationStrength = 'strong';
    else if (successRate >= 50) negotiationStrength = 'moderate';
    else negotiationStrength = 'weak';
    
    let riskLevel: 'low' | 'medium' | 'high';
    if (successRate >= 70 && askRatio <= 1.1) riskLevel = 'low';
    else if (successRate >= 50 && askRatio <= 1.3) riskLevel = 'medium';
    else riskLevel = 'high';
    
    let recommendation = '';
    if (successRate >= 80) {
      recommendation = 'Excellent position! Your ask is well-supported and likely to succeed.';
    } else if (successRate >= 65) {
      recommendation = 'Good negotiating position with solid chances of success.';
    } else if (successRate >= 45) {
      recommendation = 'Moderate position. Consider adjusting your strategy or removing weaker issues.';
    } else {
      recommendation = 'Weak position. Recommend reducing ask or focusing on highest-leverage issues only.';
    }

    return {
      totalAsk: baseAmount,
      successRate,
      expectedValue,
      negotiationStrength,
      marketAdjustment: adjustment,
      riskLevel,
      recommendation,
      alternatives: generateAlternatives(enabledIssuesList, baseAmount, marketConditions)
    };
  };

  const generateAlternatives = (
    enabledIssuesList: PrioritizedIssue[], 
    currentAsk: number,
    market: MarketConditions
  ): AlternativeStrategy[] => {
    const originalTotal = enabledIssuesList.reduce((sum, issue) => sum + issue.negotiationValue, 0);
    const safetyIssues = enabledIssuesList.filter(issue => issue.severity === 'safety');
    const majorIssues = enabledIssuesList.filter(issue => issue.severity === 'major');
    const minorIssues = enabledIssuesList.filter(issue => issue.severity === 'minor');
    
    const alternatives: AlternativeStrategy[] = [];
    
    // Conservative approach
    const conservativeAmount = safetyIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0) + 
                             majorIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0) * 0.7;
    alternatives.push({
      id: 'conservative',
      title: 'Conservative Approach',
      description: 'Focus on safety issues + 70% of major repairs',
      totalValue: conservativeAmount,
      successRate: 85,
      pros: ['High success probability', 'Shows reasonableness', 'Builds goodwill'],
      cons: ['Leaves money on table', 'May miss legitimate claims'],
      bestFor: 'Competitive markets or motivated buyers'
    });

    // Aggressive approach
    const aggressiveAmount = originalTotal * 1.25;
    alternatives.push({
      id: 'aggressive',
      title: 'Aggressive Opening',
      description: 'Ask for 125% of estimated costs to create negotiation room',
      totalValue: aggressiveAmount,
      successRate: 35,
      pros: ['Maximum potential return', 'Room to negotiate down', 'Tests seller motivation'],
      cons: ['May offend seller', 'Could stall negotiations', 'Risk of rejection'],
      bestFor: 'Buyer&apos;s markets or when you have strong alternatives'
    });

    // Hybrid approach
    if (safetyIssues.length > 0 && majorIssues.length > 0) {
      const hybridCredit = safetyIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0) * 0.8;
      const hybridRepairValue = majorIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
      
      alternatives.push({
        id: 'hybrid',
        title: 'Credit + Seller Repairs',
        description: `${formatCurrency(hybridCredit)} credit + seller handles major repairs`,
        totalValue: hybridCredit + hybridRepairValue,
        successRate: 75,
        pros: ['Ensures quality repairs', 'Reduces closing delays', 'Seller controls costs'],
        cons: ['Less cash at closing', 'Repair timing uncertainty', 'Quality control issues'],
        bestFor: 'When you trust seller&apos;s contractor choices'
      });
    }

    // Market-adjusted approach
    let marketMultiplier = 1;
    if (market.marketType === 'buyer') marketMultiplier = 1.1;
    else if (market.marketType === 'seller') marketMultiplier = 0.9;
    
    const marketAmount = originalTotal * marketMultiplier;
    alternatives.push({
      id: 'market_adjusted',
      title: 'Market-Optimized Ask',
      description: `Adjusted for current ${market.marketType}&apos;s market conditions`,
      totalValue: marketAmount,
      successRate: 65,
      pros: ['Reflects market reality', 'Appropriate for conditions', 'Balanced approach'],
      cons: ['May not maximize value', 'Still involves negotiation'],
      bestFor: 'Standard market conditions with typical seller motivation'
    });

    return alternatives.sort((a, b) => b.successRate - a.successRate);
  };

  const currentScenario = calculateScenario(askAmount, enabledIssues, marketAdjustment);

  const handleIssueToggle = (issueId: string) => {
    const newEnabled = new Set(enabledIssues);
    if (newEnabled.has(issueId)) {
      newEnabled.delete(issueId);
    } else {
      newEnabled.add(issueId);
    }
    setEnabledIssues(newEnabled);
    
    // Recalculate ask amount based on enabled issues
    const newTotal = issues
      .filter(issue => newEnabled.has(issue.id))
      .reduce((sum, issue) => sum + issue.negotiationValue, 0);
    setAskAmount(newTotal);
    
    onStrategyChange?.(newTotal, newEnabled);
  };

  const handleAskChange = (value: number[]) => {
    setAskAmount(value[0]);
    onStrategyChange?.(value[0], enabledIssues);
  };

  const applyAlternative = (alternative: AlternativeStrategy) => {
    setSelectedAlternative(alternative.id);
    
    if (alternative.id === 'conservative') {
      // Enable only safety and major issues
      const newEnabled = new Set(
        issues
          .filter(issue => issue.severity === 'safety' || issue.severity === 'major')
          .map(issue => issue.id)
      );
      setEnabledIssues(newEnabled);
      setAskAmount(alternative.totalValue);
    } else if (alternative.id === 'aggressive') {
      // Enable all issues and increase ask
      const newEnabled = new Set(issues.map(issue => issue.id));
      setEnabledIssues(newEnabled);
      setAskAmount(alternative.totalValue);
    } else {
      setAskAmount(alternative.totalValue);
    }
    
    onStrategyChange?.(alternative.totalValue, enabledIssues);
  };

  const maxPossible = issues.reduce((sum, issue) => sum + issue.negotiationValue, 0) * 1.5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[#5C1B10]" />
          Interactive &quot;What-If&quot; Scenario Planner
        </CardTitle>
        <p className="text-gray-600">
          Experiment with different strategies and see their likely outcomes
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculator">Strategy Calculator</TabsTrigger>
            <TabsTrigger value="alternatives">Alternative Approaches</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator" className="space-y-6">
            {/* Interactive Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Adjust Your Ask</h3>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(askAmount)}
                    </span>
                  </div>
                  <Slider
                    value={[askAmount]}
                    onValueChange={handleAskChange}
                    max={maxPossible}
                    min={1000}
                    step={500}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$1,000</span>
                    <span>{formatCurrency(maxPossible)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Market Adjustment</h3>
                  <Slider
                    value={[marketAdjustment]}
                    onValueChange={(value) => setMarketAdjustment(value[0])}
                    max={5000}
                    min={-5000}
                    step={250}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-$5,000</span>
                    <span>+$5,000</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Adjust for market conditions: {formatCurrency(marketAdjustment)}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Include/Exclude Issues</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {issues.slice(0, 6).map(issue => (
                      <div key={issue.id} className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={enabledIssues.has(issue.id)}
                            onChange={() => handleIssueToggle(issue.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="truncate">{issue.category}</span>
                        </label>
                        <span className="text-xs text-gray-600">
                          {formatCurrency(issue.negotiationValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-[#5C1B10]" />
                    <h3 className="font-semibold text-gray-900">Scenario Results</h3>
                  </div>
                  
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {formatCurrency(currentScenario.totalAsk)}
                  </div>
                  <Badge 
                    className={`mb-3 ${
                      currentScenario.negotiationStrength === 'strong' ? 'bg-green-100 text-green-800' :
                      currentScenario.negotiationStrength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {currentScenario.successRate}% Success Rate
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Expected Value</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(currentScenario.expectedValue)}
                    </p>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Risk Level</span>
                    </div>
                    <Badge 
                      className={
                        currentScenario.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                        currentScenario.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {currentScenario.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm mb-1">AI Recommendation</p>
                      <p className="text-sm text-blue-800">
                        {currentScenario.recommendation}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Market Impact:</span>
                  <span className={`font-medium ${
                    marketAdjustment > 0 ? 'text-green-600' : 
                    marketAdjustment < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {marketAdjustment === 0 ? 'Neutral' : formatCurrency(marketAdjustment)}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alternatives" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentScenario.alternatives.map(alternative => (
                <Card 
                  key={alternative.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedAlternative === alternative.id 
                      ? 'border-[#5C1B10] bg-[#5C1B10]/5' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => applyAlternative(alternative)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {alternative.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {alternative.description}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {alternative.successRate}%
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(alternative.totalValue)}
                      </span>
                      <span className="text-sm text-gray-600">
                        Expected: {formatCurrency(alternative.totalValue * alternative.successRate / 100)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Pros:</p>
                        <ul className="text-xs text-green-600 space-y-0.5">
                          {alternative.pros.slice(0, 2).map((pro, i) => (
                            <li key={i}>• {pro}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Cons:</p>
                        <ul className="text-xs text-red-600 space-y-0.5">
                          {alternative.cons.slice(0, 2).map((con, i) => (
                            <li key={i}>• {con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Best for:</span> {alternative.bestFor}
                      </p>
                    </div>

                    <Button
                      className={`w-full mt-3 ${
                        selectedAlternative === alternative.id
                          ? 'bg-[#5C1B10] hover:bg-[#4A1508]'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      size="sm"
                    >
                      {selectedAlternative === alternative.id ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Applied
                        </>
                      ) : (
                        'Apply Strategy'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900 mb-2">Strategy Comparison</h3>
                  <div className="text-sm text-amber-800 space-y-1">
                    <p><strong>Current Strategy:</strong> {formatCurrency(currentScenario.totalAsk)} ({currentScenario.successRate}% success)</p>
                    <p><strong>Expected Value:</strong> {formatCurrency(currentScenario.expectedValue)}</p>
                    {selectedAlternative && (
                      <p><strong>Selected Alternative:</strong> {currentScenario.alternatives.find(a => a.id === selectedAlternative)?.title}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}