"use client";

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
  CheckCircle
} from "lucide-react";

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
  // Mock strategy data - this would come from AI analysis
  const strategy = {
    recommendedAsk: Math.round(totalEstimatedCredits * 1.2),
    expectedNegotiation: totalEstimatedCredits,
    minimumAcceptable: Math.round(totalEstimatedCredits * 0.8),
    marketLeverage: 'moderate',
    sellerMotivation: 'standard',
    priorityIssues: [
      {
        category: 'Safety Issues',
        totalCost: Math.round(totalEstimatedCredits * 0.4),
        urgency: 'immediate',
        negotiationPower: 'high'
      },
      {
        category: 'Major Systems',
        totalCost: Math.round(totalEstimatedCredits * 0.35),
        urgency: '1-2 years',
        negotiationPower: 'moderate'
      },
      {
        category: 'Minor Repairs',
        totalCost: Math.round(totalEstimatedCredits * 0.25),
        urgency: 'long-term',
        negotiationPower: 'low'
      }
    ]
  };

  const allIssues = reports.flatMap(r => r.issues || []);
  const safetyIssues = allIssues.filter(issue => issue.severity === 'safety');
  const majorIssues = allIssues.filter(issue => issue.severity === 'major');

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Your Negotiation Strategy
          </CardTitle>
          <p className="text-gray-600">
            Data-backed recommendations for your inspection credit negotiation
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-green-900 mb-1">
                ${strategy.recommendedAsk.toLocaleString()}
              </p>
              <p className="text-sm text-green-700 font-medium mb-2">Initial Ask</p>
              <p className="text-xs text-green-600">
                Start high to create negotiation room
              </p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-blue-900 mb-1">
                ${strategy.expectedNegotiation.toLocaleString()}
              </p>
              <p className="text-sm text-blue-700 font-medium mb-2">Target Amount</p>
              <p className="text-xs text-blue-600">
                Realistic expectation based on data
              </p>
            </div>
            
            <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
              <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-orange-900 mb-1">
                ${strategy.minimumAcceptable.toLocaleString()}
              </p>
              <p className="text-sm text-orange-700 font-medium mb-2">Walk-Away Point</p>
              <p className="text-xs text-orange-600">
                Don&apos;t accept less than this amount
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Negotiation Priorities</CardTitle>
          <p className="text-gray-600">
            Lead with these high-impact issues for maximum negotiation power
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {strategy.priorityIssues.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${index === 0 ? 'bg-red-100 text-red-800' : 
                      index === 1 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{category.category}</h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {category.urgency} • {category.negotiationPower} negotiation power
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    ${category.totalCost.toLocaleString()}
                  </p>
                  <Badge className={
                    category.negotiationPower === 'high' ? 'bg-red-100 text-red-800' :
                    category.negotiationPower === 'moderate' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {category.negotiationPower} priority
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Talking Points */}
      <Card>
        <CardHeader>
          <CardTitle>Key Talking Points</CardTitle>
          <p className="text-gray-600">
            Use these data-backed arguments in your negotiation
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {safetyIssues.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 mb-2">Safety Concerns (Immediate Attention)</h3>
                    <p className="text-sm text-red-800 mb-3">
                      The inspection revealed {safetyIssues.length} safety issue{safetyIssues.length !== 1 ? 's' : ''} that require immediate attention before closing. These pose liability risks and cannot be deferred.
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {safetyIssues.slice(0, 3).map((issue, i) => (
                        <li key={i}>• {issue.description}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {majorIssues.length > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-900 mb-2">Major System Issues</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      These major system issues will require professional attention within 1-2 years. Current market rates for these repairs are reflected in our credit request.
                    </p>
                    <ul className="text-sm text-orange-700 space-y-1">
                      {majorIssues.slice(0, 3).map((issue, i) => (
                        <li key={i}>• {issue.description} - Est. ${issue.negotiationValue?.toLocaleString() || 'TBD'}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">Market Context</h3>
                  <p className="text-sm text-blue-800">
                    Our credit request is based on current local contractor rates and material costs. In today&apos;s market, these repairs would cost significantly more if deferred due to inflation and labor shortages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-gray-900">Present your initial ask of <strong>${strategy.recommendedAsk.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-gray-900">Lead with safety issues for maximum impact</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-gray-900">Be prepared to negotiate down to <strong>${strategy.minimumAcceptable.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-gray-900">Use specific cost estimates and market data as justification</span>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <Button className="bg-[#5C1B10] hover:bg-[#4A1508] text-white">
              <Download className="h-4 w-4 mr-2" />
              Download Negotiation Package
            </Button>
            <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
              <Share className="h-4 w-4 mr-2" />
              Share with Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}