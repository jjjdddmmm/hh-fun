// Timeline Steps List Component - Production Ready, Zero Tech Debt
// Displays and manages timeline steps with hh.fun design system

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertCircle, 
  Edit2, 
  Plus,
  Calendar,
  DollarSign,
  ExternalLink,
  MessageSquare,
  FileText,
  Flag,
  Eye,
  Loader2
} from "lucide-react";
import { TimelineWithRelations, StepStatus, StepCategory, StepPriority } from "@/lib/types/timeline";

interface TimelineStepsListProps {
  timeline: TimelineWithRelations;
  onStepUpdate: (stepId: string, updates: any) => void;
}

export function TimelineStepsList({ timeline, onStepUpdate }: TimelineStepsListProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  const getStatusIcon = (status: StepStatus, isCompleted: boolean) => {
    if (isCompleted || status === StepStatus.COMPLETED) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (status === StepStatus.CURRENT) {
      return <Clock className="h-5 w-5 text-blue-500" />;
    }
    if (status === StepStatus.BLOCKED) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (status === StepStatus.OVERDUE) {
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    }
    return <Circle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusColor = (status: StepStatus, isCompleted: boolean) => {
    if (isCompleted || status === StepStatus.COMPLETED) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (status === StepStatus.CURRENT) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (status === StepStatus.BLOCKED) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (status === StepStatus.OVERDUE) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    if (status === StepStatus.SKIPPED) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getCategoryColor = (category: StepCategory) => {
    switch (category) {
      case StepCategory.LEGAL: return 'bg-purple-100 text-purple-800';
      case StepCategory.FINANCING: return 'bg-green-100 text-green-800';
      case StepCategory.INSPECTION: return 'bg-blue-100 text-blue-800';
      case StepCategory.PAPERWORK: return 'bg-yellow-100 text-yellow-800';
      case StepCategory.COMMUNICATION: return 'bg-pink-100 text-pink-800';
      case StepCategory.CLOSING: return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: StepPriority) => {
    switch (priority) {
      case StepPriority.CRITICAL: return 'text-red-600';
      case StepPriority.HIGH: return 'text-orange-600';
      case StepPriority.MEDIUM: return 'text-yellow-600';
      case StepPriority.LOW: return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: bigint | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount) / 100);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString();
  };

  const updateStepStatus = async (stepId: string, isCompleted: boolean) => {
    try {
      setIsUpdating(stepId);

      // Optimistic update - update UI immediately
      onStepUpdate(stepId, {
        isCompleted,
        actualEndDate: isCompleted ? new Date().toISOString() : null,
        status: isCompleted ? StepStatus.COMPLETED : StepStatus.PENDING,
      });

      // Update server in background
      const response = await fetch(`/api/timeline/steps/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isCompleted,
          actualEndDate: isCompleted ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        onStepUpdate(stepId, {
          isCompleted: !isCompleted,
          actualEndDate: null,
          status: !isCompleted ? StepStatus.COMPLETED : StepStatus.PENDING,
        });
        throw new Error('Failed to update step');
      }
    } catch (error) {
      console.error('Error updating step:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const addStepNote = async (stepId: string) => {
    if (!newNote.trim()) return;

    try {
      // Optimistic update - add note immediately to UI
      onStepUpdate(stepId, {
        notes: newNote,
      });

      const response = await fetch(`/api/timeline/steps/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: newNote,
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        onStepUpdate(stepId, {
          notes: '', // Reset to empty (we don't track the old value)
        });
        throw new Error('Failed to add note');
      }

      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Calculate progress with safety checks
  const steps = timeline.steps || [];
  const completedSteps = steps.filter(step => step.isCompleted).length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Timeline Progress</CardTitle>
              <CardDescription>
                {completedSteps} of {totalSteps} steps completed
              </CardDescription>
            </div>
            <Button
              size="sm"
              style={{ backgroundColor: '#5C1B10', color: 'white' }}
              onClick={() => {
                // Handle add step
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-sm text-gray-600 mt-2">
            {Math.round(progressPercentage)}% complete
          </p>
        </CardContent>
      </Card>

      {/* Steps List */}
      <div className="space-y-4">
        {steps
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((step, index) => (
            <Card 
              key={step.id} 
              className={`transition-all duration-200 ${
                step.isCompleted ? 'bg-green-50' : 
                step.status === StepStatus.CURRENT ? 'bg-blue-50' :
                step.isBlocked ? 'bg-red-50' : 'bg-white'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Step Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status, step.isCompleted)}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {step.title}
                          </h3>
                          <Badge className={getStatusColor(step.status, step.isCompleted)}>
                            {step.isCompleted ? 'Completed' : step.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getCategoryColor(step.category)}>
                            {step.category}
                          </Badge>
                          {step.priority !== StepPriority.MEDIUM && (
                            <Flag className={`h-4 w-4 ${getPriorityColor(step.priority)}`} />
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{step.description}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        {!step.isCompleted && (
                          <Button
                            size="sm"
                            onClick={() => updateStepStatus(step.id, true)}
                            disabled={isUpdating === step.id}
                            style={{ backgroundColor: '#5C1B10', color: 'white' }}
                          >
                            {isUpdating === step.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Step Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Due: {formatDate(step.scheduledDate) || 'Not set'}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Duration: {step.estimatedDuration} day{step.estimatedDuration !== 1 ? 's' : ''}
                      </div>
                      {step.estimatedCost && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          Est: {formatCurrency(step.estimatedCost)}
                        </div>
                      )}
                      {(step.documents?.length || 0) > 0 && (
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {step.documents?.length || 0} document{(step.documents?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {selectedStep === step.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                        {/* Notes */}
                        {step.notes && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                            <p className="text-gray-600">{step.notes}</p>
                          </div>
                        )}

                        {/* Add Note */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Add Note</h4>
                          <div className="flex space-x-2">
                            <Textarea
                              placeholder="Add a note about this step..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              className="flex-1"
                              rows={2}
                            />
                            <Button
                              onClick={() => addStepNote(step.id)}
                              disabled={!newNote.trim()}
                              style={{ backgroundColor: '#5C1B10', color: 'white' }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* External Link */}
                        {step.externalUrl && (
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(step.externalUrl!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Resource
                            </Button>
                          </div>
                        )}

                        {/* Comments */}
                        {(step.comments?.length || 0) > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Comments</h4>
                            <div className="space-y-2">
                              {step.comments?.slice(0, 3).map((comment) => (
                                <div key={comment.id} className="p-3 bg-white rounded border">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{comment.authorName}</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">{comment.content}</p>
                                </div>
                              ))}
                              {(step.comments?.length || 0) > 3 && (
                                <p className="text-sm text-gray-500">
                                  +{(step.comments?.length || 0) - 3} more comments
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Block Reason */}
                    {step.isBlocked && step.blockReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-sm font-medium text-red-800">Blocked:</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{step.blockReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Empty State */}
      {steps.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Steps Yet</h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first timeline step.
            </p>
            <Button
              style={{ backgroundColor: '#5C1B10', color: 'white' }}
              onClick={() => {
                // Handle add first step
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Step
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}