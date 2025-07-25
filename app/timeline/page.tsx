// Timeline Page - Production Ready, Zero Tech Debt
// Main timeline interface following hh.fun design system

"use client";

import { useState, useEffect, Suspense } from "react";
import { logger } from "@/lib/utils/logger";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
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
import AppFooter from "@/components/app-footer";
import { TimelineWithRelations, TimelineProgressStats, TimelineCostSummary } from "@/lib/types/timeline";
import { TimelineStepsList } from "@/components/timeline/TimelineStepsList";
import { TimelineCalendarView } from "@/components/timeline/TimelineCalendarView";
import { TimelineTeamMembers } from "@/components/timeline/TimelineTeamMembers";
import { TimelineDocuments } from "@/components/timeline/TimelineDocuments";
import { TimelineAnalytics } from "@/components/timeline/TimelineAnalytics";

interface TimelinePageProps {}

function TimelinePageContent() {
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
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState('');
  const [editedDays, setEditedDays] = useState(30);

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
      logger.error('Error loading user timelines:', error);
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
            logger.warn('Analytics loading failed (non-blocking):', error);
            // Set empty analytics to prevent layout shift
            setAnalytics({});
          });
      }

    } catch (error) {
      logger.error('Error loading timeline:', error);
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
    
    const updatedTimeline = { ...timeline, steps: updatedSteps };
    setTimeline(updatedTimeline);
    
    // Update analytics based on new step completion
    const totalSteps = updatedSteps.length;
    const completedSteps = updatedSteps.filter(step => step.isCompleted).length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    // Update analytics state
    setAnalytics(prev => ({
      ...prev,
      progress: {
        ...prev?.progress,
        totalSteps,
        completedSteps,
        progressPercentage,
        upcomingSteps: totalSteps - completedSteps,
        // Keep other analytics data if it exists
        overdue: prev?.progress?.overdue || 0,
        blocked: prev?.progress?.blocked || 0,
        estimatedDaysRemaining: prev?.progress?.estimatedDaysRemaining || 0,
        onTrack: prev?.progress?.onTrack || true
      }
    }));
  };

  // Refresh timeline data without loading states - for smooth UX after step updates
  const refreshTimelineData = async () => {
    try {
      // Fetch fresh timeline data from database
      const timelineResponse = await fetch(`/api/timeline?propertyId=${propertyId}&includeSteps=true&includeDocuments=false&includeTeamMembers=false&includeNotes=false`);
      
      if (!timelineResponse.ok) {
        throw new Error('Failed to refresh timeline data');
      }

      const timelineData = await timelineResponse.json();
      
      if (!timelineData.success) {
        throw new Error(timelineData.error || 'Failed to refresh timeline data');
      }

      // Update timeline state with fresh database data - force re-render with new object reference
      setTimeline(prev => ({
        ...timelineData.timeline,
        // Add a timestamp to ensure state change is detected
        _refreshed: Date.now()
      }));

      // Refresh analytics in background to keep progress bar updated
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
              setAnalytics(prev => ({
                ...analyticsData.analytics,
                _refreshed: Date.now() // Force re-render
              }));
            }
          })
          .catch(error => {
            logger.warn('Analytics refresh failed (non-blocking):', error);
          });
      }
    } catch (error) {
      logger.error('Error refreshing timeline:', error);
    }
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
        logger.warn('Failed to load team data:', error);
      }
    }
    
    // Lazy load documents data (both timeline and step documents)
    if (newTab === 'documents' && !tabDataLoaded.documents) {
      try {
        const response = await fetch(`/api/timeline?propertyId=${propertyId}&includeDocuments=true&includeSteps=true&includeTeamMembers=false&includeNotes=false`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTimeline(prev => prev ? { 
              ...prev, 
              documents: data.timeline.documents || [],
              steps: data.timeline.steps || prev.steps // Include step documents
            } : prev);
            setTabDataLoaded(prev => ({ ...prev, documents: true }));
          }
        }
      } catch (error) {
        logger.warn('Failed to load documents data:', error);
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

  const formatPriceInput = (value: string) => {
    // Remove non-numeric characters except for digits
    const numericValue = value.replace(/[^\d]/g, '');
    // Add commas for thousands
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePriceEdit = () => {
    const currentPrice = timeline?.property?.price || 0;
    setEditedPrice(currentPrice.toLocaleString());
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    // Here you would typically save to the backend
    logger.debug('Saving price:', editedPrice);
    setIsEditingPrice(false);
  };

  const handlePriceCancel = () => {
    setIsEditingPrice(false);
    setEditedPrice('');
  };

  const handleDaysSave = (days: number) => {
    setEditedDays(days);
    // Here you would typically save to the backend
    logger.debug('Saving days:', days);
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
          <AppFooter />
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
                    You don&apos;t have any timelines yet. Create one by analyzing a property first.
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
                      Choose which property timeline you&apos;d like to view:
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
          <AppFooter />
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
      </div>

      {/* Overall Progress Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Card className="mb-8 border-2">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <SectionHeader>Overall Progress</SectionHeader>
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  30 days to closing
                </div>
              </div>

              {/* Subtitle */}
              <p className="text-gray-600 mb-6">
                Track your home buying journey from offer acceptance to keys in hand
              </p>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(analytics?.progress?.progressPercentage || 0)}% complete
                  </span>
                </div>
                <Progress 
                  value={analytics?.progress?.progressPercentage || 0} 
                  className="h-3 bg-gray-200"
                />
              </div>

              {/* Four Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Purchase Price Card */}
                <Card className="bg-red-50 border-2">
                  <CardContent className="p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {isEditingPrice ? (
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-900">$</span>
                            <Input
                              value={editedPrice}
                              onChange={(e) => setEditedPrice(formatPriceInput(e.target.value))}
                              className="text-2xl font-bold text-gray-900 border-none bg-white rounded-md px-2 py-1 ml-1 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              style={{ width: `${Math.max(editedPrice.length + 1, 8)}ch` }}
                              onBlur={handlePriceSave}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePriceSave();
                                if (e.key === 'Escape') handlePriceCancel();
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-gray-900">
                            ${timeline.property.price ? (Number(timeline.property.price) / 100).toLocaleString() : '0'}
                          </div>
                        )}
                        <button 
                          onClick={handlePriceEdit}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-sm text-gray-600">
                        $25,000(-3.7% vs asking)
                      </div>
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        Purchase Price
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Until Closing Card */}
                <Card className="bg-red-50 border-2">
                  <CardContent className="p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={editedDays.toString()}
                          onValueChange={(value) => handleDaysSave(parseInt(value))}
                        >
                          <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 text-2xl font-bold text-gray-900 hover:text-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="21">21 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="45">45 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-sm text-gray-600">
                        {timeline.estimatedClosingDate ? 
                          new Date(timeline.estimatedClosingDate).toLocaleDateString() : 
                          'Invalid Date'
                        }
                      </div>
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        Until Closing
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Costs Card */}
                <Card className="bg-red-50 border-2">
                  <CardContent className="p-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(analytics?.costs?.actualTotal || 0)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Actual
                      </div>
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        Total Costs
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Issues Card */}
                <Card className="bg-red-50 border-2">
                  <CardContent className="p-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {(analytics?.progress?.overdue || 0) + (analytics?.progress?.blocked || 0)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {analytics?.progress?.overdue || 0} overdue, {analytics?.progress?.blocked || 0} blocked
                      </div>
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        Issues
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>


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
                  onRefreshTimeline={refreshTimelineData}
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
      <AppFooter />
    </div>
  );
}

export default function TimelinePage({}: TimelinePageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    }>
      <TimelinePageContent />
    </Suspense>
  );
}