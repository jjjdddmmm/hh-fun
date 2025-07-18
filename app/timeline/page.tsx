// Timeline Page - Production Ready, Zero Tech Debt
// Main timeline interface following hh.fun design system

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  FileText, 
  TrendingUp,
  Home,
  ArrowLeft,
  Plus,
  Settings,
  DollarSign
} from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppNavigation from "@/components/app-navigation";
import { TimelineWithRelations, TimelineProgressStats, TimelineCostSummary } from "@/lib/types/timeline";
import { TimelineStepsList } from "@/components/timeline/TimelineStepsList";
import { TimelineCalendarView } from "@/components/timeline/TimelineCalendarView";
import { TimelineTeamMembers } from "@/components/timeline/TimelineTeamMembers";
import { TimelineDocuments } from "@/components/timeline/TimelineDocuments";
import { TimelineAnalytics } from "@/components/timeline/TimelineAnalytics";

interface TimelinePageProps {}

export default function TimelinePage({}: TimelinePageProps) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State management
  const [timeline, setTimeline] = useState<TimelineWithRelations | null>(null);
  const [analytics, setAnalytics] = useState<{
    progress?: TimelineProgressStats;
    costs?: TimelineCostSummary;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'steps' | 'calendar' | 'team' | 'documents' | 'analytics'>('steps');
  const [tabDataLoaded, setTabDataLoaded] = useState({
    team: false,
    documents: false
  });
  const [error, setError] = useState<string | null>(null);
  const [userTimelines, setUserTimelines] = useState<any[]>([]);

  // Get property ID from URL params
  const propertyId = searchParams.get('propertyId');

  // Load timeline data
  useEffect(() => {
    if (!user) return;
    
    if (propertyId) {
      loadTimeline();
    } else {
      // No propertyId provided, check user's timelines
      loadUserTimelines();
    }
  }, [user, propertyId]);

  const loadUserTimelines = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all user's timelines
      const response = await fetch('/api/timeline/list');
      
      if (!response.ok) {
        throw new Error('Failed to load timelines');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load timelines');
      }

      const timelines = data.timelines || [];
      setUserTimelines(timelines);

      if (timelines.length === 1) {
        // Only one timeline - automatically load it
        const singleTimeline = timelines[0];
        router.replace(`/timeline?propertyId=${singleTimeline.propertyId}`);
        return;
      } else if (timelines.length === 0) {
        // No timelines - show guidance to create one
        setIsLoading(false);
      } else {
        // Multiple timelines - show selection
        setIsLoading(false);
      }

    } catch (error) {
      console.error('Error loading user timelines:', error);
      setError(error instanceof Error ? error.message : 'Failed to load timelines');
      setIsLoading(false);
    }
  };

  const loadTimeline = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load basic timeline data first (no heavy includes for faster loading)
      const timelineResponse = await fetch(`/api/timeline?propertyId=${propertyId}&includeSteps=true&includeDocuments=false&includeTeamMembers=false&includeNotes=false`);

      // Handle timeline response
      if (!timelineResponse.ok) {
        if (timelineResponse.status === 404) {
          setError('Timeline not found for this property');
          return;
        }
        throw new Error('Failed to load timeline');
      }

      const timelineData = await timelineResponse.json();
      
      if (!timelineData.success) {
        throw new Error(timelineData.error || 'Failed to load timeline');
      }

      setTimeline(timelineData.timeline);

      // Load analytics in background (non-blocking)
      if (timelineData.timeline?.id) {
        fetch(`/api/timeline/analytics?timelineId=${timelineData.timeline.id}&includeProgress=true&includeCosts=true`)
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error(`Analytics API error: ${response.status}`);
          })
          .then(analyticsData => {
            if (analyticsData.success) {
              setAnalytics(analyticsData.analytics);
            }
          })
          .catch(error => {
            console.warn('Analytics loading failed (non-blocking):', error);
            // Set empty analytics to prevent layout shift
            setAnalytics({});
          });
      }

    } catch (error) {
      console.error('Error loading timeline:', error);
      setError(error instanceof Error ? error.message : 'Failed to load timeline');
    } finally {
      setIsLoading(false);
    }
  };

  // Optimistic update function - no loading states
  const updateTimelineStep = (stepId: string, updates: any) => {
    if (!timeline) return;
    
    const updatedSteps = timeline.steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    );
    
    setTimeline({ ...timeline, steps: updatedSteps });
  };

  // Load additional data when user switches tabs
  const handleTabChange = async (newTab: string) => {
    setActiveTab(newTab as typeof activeTab);
    
    if (!timeline) return;
    
    // Lazy load team data
    if (newTab === 'team' && !tabDataLoaded.team) {
      try {
        const response = await fetch(`/api/timeline?propertyId=${propertyId}&includeTeamMembers=true&includeSteps=false&includeDocuments=false`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.timeline.teamMembers) {
            setTimeline(prev => prev ? { ...prev, teamMembers: data.timeline.teamMembers } : prev);
            setTabDataLoaded(prev => ({ ...prev, team: true }));
          }
        }
      } catch (error) {
        console.warn('Failed to load team data:', error);
      }
    }
    
    // Lazy load documents data
    if (newTab === 'documents' && !tabDataLoaded.documents) {
      try {
        const response = await fetch(`/api/timeline?propertyId=${propertyId}&includeDocuments=true&includeSteps=false&includeTeamMembers=false`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.timeline.documents) {
            setTimeline(prev => prev ? { ...prev, documents: data.timeline.documents } : prev);
            setTabDataLoaded(prev => ({ ...prev, documents: true }));
          }
        }
      } catch (error) {
        console.warn('Failed to load documents data:', error);
      }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELAYED': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <AppNavigation />
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Calendar className="h-4 w-4" />
                <span>Timeline</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Home Purchase Timeline
              </h1>
              <p className="text-xl text-gray-600">
                Track every step of your home buying journey with intelligent scheduling and progress monitoring.
              </p>
            </div>

            {/* Property Info Bar Skeleton */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
              <div className="flex items-center space-x-4">
                <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div>
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Progress Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Content Loading */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading timeline...</p>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={loadTimeline} variant="outline" size="sm">
                Try Again
              </Button>
              <Button 
                onClick={() => router.push('/analysis')} 
                variant="outline" 
                size="sm"
              >
                Back to Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No propertyId provided - show property selection or timeline list
  if (!propertyId) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <AppNavigation />
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Calendar className="h-4 w-4" />
                <span>Timeline</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Home Purchase Timeline
              </h1>
              <p className="text-xl text-gray-600">
                Track every step of your home buying journey with intelligent scheduling and progress monitoring.
              </p>
            </div>

            {/* Content based on timelines available */}
            {userTimelines.length === 0 ? (
              // No timelines - guide to create one
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    No Timelines Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6">
                    You don't have any timelines yet. Create one by analyzing a property first.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => router.push('/analysis')}
                      style={{ backgroundColor: '#5C1B10', color: 'white' }}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Analyze a Property
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Multiple timelines - show selection
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Select a Timeline
                    </CardTitle>
                    <CardDescription>
                      Choose which property timeline you'd like to view:
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {userTimelines.map((timeline) => (
                        <Card 
                          key={timeline.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-[#5C1B10]"
                          onClick={() => router.push(`/timeline?propertyId=${timeline.propertyId}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {timeline.property.address}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {timeline.property.city}, {timeline.property.state}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span>Status: {timeline.status.replace('_', ' ')}</span>
                                  {timeline.property.price && (
                                    <span>${timeline.property.price.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                              <ArrowLeft className="h-5 w-5 text-[#5C1B10] rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!timeline) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              No Timeline Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              No timeline exists for this property yet. Would you like to create one?
            </p>
            <Button 
              onClick={() => {
                // Handle timeline creation
                router.push(`/timeline/create?propertyId=${propertyId}`);
              }}
              className="w-full"
              style={{ backgroundColor: '#5C1B10', color: 'white' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Timeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <AppNavigation />
        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4" />
              <span>Timeline</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Home Purchase Timeline
            </h1>
            <p className="text-xl text-gray-600">
              Track every step of your home buying journey with intelligent scheduling and progress monitoring.
            </p>
          </div>

          {/* Property Info Bar */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/analysis')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analysis
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{timeline.title}</h2>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Home className="h-4 w-4 mr-1" />
                    {timeline.property.address}
                  </p>
                  <Badge className={getStatusColor(timeline.status)}>
                    {timeline.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Handle timeline settings
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Progress Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Progress 
                      value={analytics?.progress?.progressPercentage || 0} 
                      className="h-2"
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(analytics?.progress?.progressPercentage || 0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics?.progress?.completedSteps || 0} of {analytics?.progress?.totalSteps || 0} steps
                </p>
              </CardContent>
            </Card>

            {/* Days Remaining */}
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

            {/* Total Cost */}
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

            {/* Issues */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <AlertCircle className={`h-5 w-5 ${
                    (analytics?.progress?.overdue || 0) + (analytics?.progress?.blocked || 0) > 0 
                      ? 'text-red-500' 
                      : 'text-green-500'
                  }`} />
                  <span className="text-2xl font-bold">
                    {(analytics?.progress?.overdue || 0) + (analytics?.progress?.blocked || 0)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics?.progress?.overdue || 0} overdue, {analytics?.progress?.blocked || 0} blocked
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="steps" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Steps
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="steps">
                <TimelineStepsList 
                  timeline={timeline}
                  onStepUpdate={updateTimelineStep}
                />
              </TabsContent>

              <TabsContent value="calendar">
                <TimelineCalendarView 
                  timeline={timeline}
                  onStepUpdate={updateTimelineStep}
                />
              </TabsContent>

              <TabsContent value="team">
                <TimelineTeamMembers 
                  timeline={timeline}
                  onTeamUpdate={loadTimeline}
                />
              </TabsContent>

              <TabsContent value="documents">
                <TimelineDocuments 
                  timeline={timeline}
                  onDocumentUpdate={loadTimeline}
                />
              </TabsContent>

              <TabsContent value="analytics">
                <TimelineAnalytics 
                  timeline={timeline}
                  analytics={analytics}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
}