// Timeline Analytics Component - Placeholder
// TODO: Implement analytics dashboard functionality

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { TrendingUp, DollarSign, Clock, CheckCircle } from "lucide-react";
import { TimelineWithRelations, TimelineProgressStats, TimelineCostSummary } from "@/lib/types/timeline";

interface TimelineAnalyticsProps {
  timeline: TimelineWithRelations;
  analytics: {
    progress?: TimelineProgressStats;
    costs?: TimelineCostSummary;
  } | null;
}

export function TimelineAnalytics({ timeline, analytics }: TimelineAnalyticsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {Math.round(analytics?.progress?.progressPercentage || 0)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics?.progress?.completedSteps || 0} of {analytics?.progress?.totalSteps || 0} steps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Est. Days Left</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">
                {analytics?.progress?.estimatedDaysRemaining || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics?.progress?.onTrack ? 'On track' : 'Behind schedule'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(analytics?.costs?.actualTotal || analytics?.costs?.estimatedTotal || 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics?.costs?.actualTotal ? 'Actual' : 'Estimated'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">92%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Timeline efficiency</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <SectionHeader className="text-lg mb-2">Analytics Coming Soon</SectionHeader>
            <p className="text-gray-600">
              Detailed timeline analytics and insights will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}