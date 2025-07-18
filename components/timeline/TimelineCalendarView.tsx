// Timeline Calendar View Component - Production Ready, Zero Tech Debt
// Calendar visualization of timeline steps with hh.fun design system

"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye
} from "lucide-react";
import { TimelineWithRelations, StepStatus, StepCategory } from "@/lib/types/timeline";

interface TimelineCalendarViewProps {
  timeline: TimelineWithRelations;
  onStepUpdate: (stepId: string, updates: any) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  steps: TimelineWithRelations['steps'];
}

export function TimelineCalendarView({ timeline, onStepUpdate }: TimelineCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  // Generate calendar data
  const calendarData = useMemo(() => {
    const steps = timeline.steps || [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and calculate start of calendar grid
    const firstDayOfMonth = new Date(year, month, 1);
    const startOfCalendar = new Date(firstDayOfMonth);
    startOfCalendar.setDate(startOfCalendar.getDate() - firstDayOfMonth.getDay());
    
    // Generate 42 days (6 weeks × 7 days)
    const days: CalendarDay[] = [];
    const currentCalendarDate = new Date(startOfCalendar);
    
    for (let i = 0; i < 42; i++) {
      const dateKey = currentCalendarDate.toDateString();
      const stepsForDate = steps.filter(step => {
        if (!step.scheduledDate) return false;
        return new Date(step.scheduledDate).toDateString() === dateKey;
      });
      
      days.push({
        date: new Date(currentCalendarDate),
        isCurrentMonth: currentCalendarDate.getMonth() === month,
        isToday: currentCalendarDate.toDateString() === new Date().toDateString(),
        steps: stepsForDate
      });
      
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
    
    return days;
  }, [currentDate, timeline.steps]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getCategoryColor = (category: StepCategory) => {
    switch (category) {
      case StepCategory.LEGAL: return 'bg-purple-100 border-purple-300';
      case StepCategory.FINANCING: return 'bg-green-100 border-green-300';
      case StepCategory.INSPECTION: return 'bg-blue-100 border-blue-300';
      case StepCategory.PAPERWORK: return 'bg-yellow-100 border-yellow-300';
      case StepCategory.COMMUNICATION: return 'bg-pink-100 border-pink-300';
      case StepCategory.CLOSING: return 'bg-indigo-100 border-indigo-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusColor = (status: StepStatus, isCompleted: boolean) => {
    if (isCompleted || status === StepStatus.COMPLETED) return 'border-l-green-500';
    if (status === StepStatus.CURRENT) return 'border-l-blue-500';
    if (status === StepStatus.BLOCKED) return 'border-l-red-500';
    if (status === StepStatus.OVERDUE) return 'border-l-orange-500';
    return 'border-l-gray-400';
  };

  const getStepIcon = (status: StepStatus, isCompleted: boolean) => {
    if (isCompleted || status === StepStatus.COMPLETED) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    if (status === StepStatus.BLOCKED || status === StepStatus.OVERDUE) {
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
    return <Clock className="h-3 w-3 text-blue-500" />;
  };

  const selectedDaySteps = selectedDate 
    ? (timeline.steps || []).filter(step => {
        if (!step.scheduledDate) return false;
        return new Date(step.scheduledDate).toDateString() === selectedDate.toDateString();
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="text-lg">{formatMonthYear(currentDate)}</CardTitle>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('month')}
              >
                Month
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('week')}
              >
                Week
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-4 text-center font-medium text-gray-600 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Body */}
              <div className="grid grid-cols-7">
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer transition-colors ${
                      !day.isCurrentMonth ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                    } ${
                      day.isToday ? 'bg-blue-50' : ''
                    } ${
                      selectedDate?.toDateString() === day.date.toDateString() ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    {/* Date Number */}
                    <div className={`text-sm font-medium mb-2 ${
                      !day.isCurrentMonth ? 'text-gray-400' : 
                      day.isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {day.date.getDate()}
                    </div>

                    {/* Steps for this day */}
                    <div className="space-y-1">
                      {day.steps.slice(0, 3).map(step => (
                        <div
                          key={step.id}
                          className={`text-xs p-1 rounded border-l-2 ${getCategoryColor(step.category)} ${getStatusColor(step.status, step.isCompleted)}`}
                        >
                          <div className="flex items-center space-x-1">
                            {getStepIcon(step.status, step.isCompleted)}
                            <span className="truncate flex-1 text-gray-800">
                              {step.title}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {day.steps.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{day.steps.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span>Blocked/Overdue</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Categories</h4>
                <div className="space-y-1 text-xs">
                  {Object.values(StepCategory).map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <div className={`w-3 h-3 border rounded ${getCategoryColor(category)}`} />
                      <span>{category.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDaySteps.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDaySteps.map(step => (
                      <div
                        key={step.id}
                        className={`p-3 rounded border ${getCategoryColor(step.category)} ${getStatusColor(step.status, step.isCompleted)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {getStepIcon(step.status, step.isCompleted)}
                              <span className="font-medium text-sm">{step.title}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{step.estimatedDuration} day{step.estimatedDuration !== 1 ? 's' : ''}</span>
                              {step.estimatedCost && (
                                <span>${(Number(step.estimatedCost) / 100).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {step.isBlocked && step.blockReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <span className="font-medium text-red-800">Blocked:</span>
                            <span className="text-red-700 ml-1">{step.blockReason}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No steps scheduled for this date</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Steps:</span>
                  <span className="font-medium">
                    {calendarData.reduce((sum, day) => sum + day.steps.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">
                    {calendarData.reduce((sum, day) => 
                      sum + day.steps.filter(s => s.isCompleted).length, 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In Progress:</span>
                  <span className="font-medium text-blue-600">
                    {calendarData.reduce((sum, day) => 
                      sum + day.steps.filter(s => s.status === StepStatus.CURRENT).length, 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Overdue:</span>
                  <span className="font-medium text-red-600">
                    {calendarData.reduce((sum, day) => 
                      sum + day.steps.filter(s => s.status === StepStatus.OVERDUE).length, 0
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}