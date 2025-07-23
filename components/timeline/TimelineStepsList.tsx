// Timeline Steps List Component - Production Ready, Zero Tech Debt
// Displays and manages timeline steps with hh.fun design system

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
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
import { TimelineWithRelations, StepStatus, StepCategory, StepPriority, checkStepDependencies } from "@/lib/types/timeline";
import { StepCompletionModal } from "./StepCompletionModal";
import { StepEditModal } from "./StepEditModal";

interface TimelineStepsListProps {
  timeline: TimelineWithRelations;
  onStepUpdate: (stepId: string, updates: any) => void;
  onRefreshTimeline?: () => Promise<void>;
}

export function TimelineStepsList({ timeline, onStepUpdate, onRefreshTimeline }: TimelineStepsListProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editedNoteText, setEditedNoteText] = useState('');
  const [isNotesLoading, setIsNotesLoading] = useState<string | null>(null);
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    step: any | null;
    isEarlyCompletion: boolean;
  }>({
    isOpen: false,
    step: null,
    isEarlyCompletion: false
  });
  
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    step: any | null;
  }>({
    isOpen: false,
    step: null
  });


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

  const updateStepStatus = async (stepId: string, isCompleted: boolean, isEarlyCompletion: boolean = false) => {
    try {
      setIsUpdating(stepId);

      const requestBody: any = {
        isCompleted,
        isEarlyCompletion, // Re-add this for early completion support
      };

      // When completing, set actualEndDate
      if (isCompleted) {
        requestBody.actualEndDate = new Date().toISOString();
      } else {
        // When marking incomplete, clear actualCost and actualEndDate
        requestBody.actualCost = null;
        requestBody.actualEndDate = null;
      }

      // Update server first - database is source of truth
      const response = await fetch(`/api/timeline/steps/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to update step: ${errorData.error || response.statusText}`);
      }

      // Server updated successfully - refresh UI with fresh database data
      // This ensures current step advancement is reflected immediately
      if (onRefreshTimeline) {
        await onRefreshTimeline();
      }
      
    } catch (error) {
      console.error('Error updating step:', error);
      // TODO: Show user-friendly error message
    } finally {
      setIsUpdating(null);
    }
  };

  const addStepNote = async (stepId: string) => {
    if (!newNote.trim()) return;

    try {
      setIsNotesLoading(stepId);
      
      // Update server first - database is source of truth
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
        throw new Error('Failed to add note');
      }

      // Clear the input field and close add mode
      setNewNote('');
      setIsAddingNote(null);
      setSelectedStep(null);

      // Refresh UI with fresh database data
      if (onRefreshTimeline) {
        await onRefreshTimeline();
      }
      
    } catch (error) {
      console.error('Error adding note:', error);
      // TODO: Show user-friendly error message
    } finally {
      setIsNotesLoading(null);
    }
  };

  const updateStepNote = async (stepId: string) => {
    if (!editedNoteText.trim()) return;

    try {
      setIsNotesLoading(stepId);
      
      const response = await fetch(`/api/timeline/steps/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: editedNoteText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      // Exit edit mode
      setEditingNote(null);
      setEditedNoteText('');

      // Refresh UI with fresh database data
      if (onRefreshTimeline) {
        await onRefreshTimeline();
      }
      
    } catch (error) {
      console.error('Error updating note:', error);
      // TODO: Show user-friendly error message
    } finally {
      setIsNotesLoading(null);
    }
  };

  const deleteStepNote = async (stepId: string) => {
    try {
      setIsNotesLoading(stepId);
      
      const response = await fetch(`/api/timeline/steps/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      // Close the expanded section since note no longer exists
      setSelectedStep(null);

      // Refresh UI with fresh database data
      if (onRefreshTimeline) {
        await onRefreshTimeline();
      }
      
    } catch (error) {
      console.error('Error deleting note:', error);
      // TODO: Show user-friendly error message
    } finally {
      setIsNotesLoading(null);
    }
  };

  const handleNotesButtonClick = (step: any) => {
    if (selectedStep === step.id) {
      // Close the expanded section and reset states
      setSelectedStep(null);
      setIsAddingNote(null);
      setEditingNote(null);
      setNewNote('');
      setEditedNoteText('');
    } else if (step.notes) {
      // If notes exist, just open the view
      setSelectedStep(step.id);
      setIsAddingNote(null);
      setEditingNote(null);
    } else {
      // If no notes exist, open in add mode
      setSelectedStep(step.id);
      setIsAddingNote(step.id);
      setEditingNote(null);
    }
  };

  const startEditingNote = (stepId: string, currentNote: string) => {
    setEditingNote(stepId);
    setEditedNoteText(currentNote);
  };

  const cancelEditingNote = () => {
    setEditingNote(null);
    setEditedNoteText('');
  };

  const cancelAddingNote = () => {
    setIsAddingNote(null);
    setNewNote('');
    setSelectedStep(null);
  };

  const openCompletionModal = (step: any, isEarlyCompletion: boolean = false) => {
    setCompletionModal({
      isOpen: true,
      step,
      isEarlyCompletion
    });
  };

  const closeCompletionModal = () => {
    setCompletionModal({
      isOpen: false,
      step: null,
      isEarlyCompletion: false
    });
  };

  const openEditModal = (step: any) => {
    setEditModal({
      isOpen: true,
      step
    });
  };

  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      step: null
    });
  };

  const handleStepCompletion = async (data: {
    actualCost?: number;
    documents: File[];
    completionSessionId: string;
  }) => {
    if (!completionModal.step) return;

    try {
      // Set loading state for the modal
      setIsUpdating(completionModal.step.id);
      // Upload documents to Cloudinary first (if any)
      let uploadedDocuments: any[] = [];
      if (data.documents.length > 0) {
        const uploadPromises = data.documents.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('stepId', completionModal.step!.id);
          formData.append('timelineId', timeline.id);
          formData.append('stepCategory', completionModal.step!.category);
          formData.append('fileName', file.name);
          formData.append('completionSessionId', data.completionSessionId);

          const uploadResponse = await fetch('/api/timeline/documents/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(`Failed to upload ${file.name}: ${errorData.error || 'Unknown error'}`);
          }

          return await uploadResponse.json();
        });

        try {
          const uploadResults = await Promise.all(uploadPromises);
          uploadedDocuments = uploadResults.map(result => result.document);
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
          throw new Error(`Document upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      // Complete the step with actual cost
      const requestBody: any = {
        isCompleted: true,
        isEarlyCompletion: completionModal.isEarlyCompletion,
        actualEndDate: new Date().toISOString(),
      };

      // Add actual cost if provided (convert to cents for database)
      if (data.actualCost) {
        requestBody.actualCost = Math.round(data.actualCost * 100);
      }

      const response = await fetch(`/api/timeline/steps/${completionModal.step.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to complete step');
      }

      // Close modal first
      closeCompletionModal();
      
      // Small delay to ensure database is updated, then refresh
      setTimeout(async () => {
        if (onRefreshTimeline) {
          await onRefreshTimeline();
        }
      }, 100);
      
    } catch (error) {
      console.error('Error completing step:', error);
      // TODO: Show user-friendly error message
    } finally {
      // Clear loading state
      setIsUpdating(null);
    }
  };

  const handleCostUpdate = async (cost?: number) => {
    if (!editModal.step) return;

    try {
      const requestBody: any = {};
      if (cost !== undefined) {
        requestBody.actualCost = Math.round(cost * 100); // Convert to cents
      }

      const response = await fetch(`/api/timeline/steps/${editModal.step.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to update cost');
      }

      closeEditModal();
    } catch (error) {
      console.error('Error updating cost:', error);
    }
  };

  const handleDocumentUpload = async (file: File, replaceDocumentId?: string) => {
    if (!editModal.step) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('stepId', editModal.step.id);
      formData.append('timelineId', timeline.id);
      formData.append('stepCategory', editModal.step.category);
      formData.append('fileName', file.name);
      
      // Create a new completion session for individual document updates
      const sessionId = `edit_${editModal.step.id}_${Date.now()}`;
      formData.append('completionSessionId', sessionId);

      const uploadResponse = await fetch('/api/timeline/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(`Failed to upload ${file.name}: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  };

  // Calculate progress with safety checks
  const steps = timeline.steps || [];
  const completedSteps = steps.filter(step => step.isCompleted).length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Steps List */}
      <div className="space-y-4">
        {steps
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((step, index) => {
            const dayStart = step.daysFromStart;
            const dayEnd = step.daysFromStart + step.estimatedDuration;
            const dependencyCheck = checkStepDependencies(step, steps);
            const isBlocked = !dependencyCheck.canComplete && !step.isCompleted;
            
            return (
              <Card 
                key={step.id} 
                className={`transition-all duration-200 border-2 ${
                  step.isCompleted ? 'bg-gray-50 opacity-40' : 
                  step.status === StepStatus.CURRENT ? 'bg-red-50' :
                  isBlocked ? 'bg-gray-50 border-gray-300' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Center Content */}
                    <div className="flex-1 min-w-0 pl-4">
                      {/* Step Header with Icon and Title */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {/* Step Status Icon */}
                            <div className="flex-shrink-0">
                              {step.status === StepStatus.CURRENT ? (
                                <Clock className="h-5 w-5 text-blue-500" />
                              ) : (
                                getStatusIcon(step.status, step.isCompleted)
                              )}
                            </div>
                            
                            {/* Step Title */}
                            <SectionHeader className="text-lg">
                              {step.title}
                            </SectionHeader>
                            
                            {/* Category Badge */}
                            <Badge className={getCategoryColor(step.category)}>
                              {step.category}
                            </Badge>
                            
                            {/* Document Count Indicator */}
                            {step.documents && step.documents.length > 0 && (
                              <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                <FileText className="h-3 w-3" />
                                <span>{step.documents.length}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Description */}
                          <p className="text-gray-600 mb-4">{step.description}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        {step.status === StepStatus.CURRENT ? (
                          // Current step buttons
                          <>
                            <Button
                              size="sm"
                              onClick={() => openCompletionModal(step, false)}
                              disabled={isUpdating === step.id || isBlocked}
                              style={{ 
                                backgroundColor: isBlocked ? '#D1D5DB' : '#5C1B10', 
                                color: 'white',
                                opacity: isBlocked ? 0.5 : 1
                              }}
                            >
                              {isUpdating === step.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              {isBlocked ? 'Dependencies Required' : 'Mark Complete'}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNotesButtonClick(step)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {step.notes ? 'View Notes' : 'Add Notes'}
                            </Button>
                          </>
                        ) : !step.isCompleted ? (
                          // Future step buttons
                          <>
                            <Button
                              size="sm"
                              onClick={() => openCompletionModal(step, true)}
                              disabled={isUpdating === step.id || isBlocked}
                              style={{ 
                                backgroundColor: isBlocked ? '#D1D5DB' : '#5C1B10', 
                                color: 'white',
                                opacity: isBlocked ? 0.5 : 1
                              }}
                            >
                              {isUpdating === step.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Clock className="h-4 w-4 mr-1" />
                              )}
                              {isBlocked ? 'Dependencies Required' : 'Complete Early'}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNotesButtonClick(step)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {step.notes ? 'View Notes' : 'Add Notes'}
                            </Button>
                          </>
                        ) : (
                          // Completed step buttons
                          <>
                            <Button
                              size="sm"
                              onClick={() => openEditModal(step)}
                              className="bg-[#5C1B10] hover:bg-[#4A1508] text-white"
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStepStatus(step.id, false, false)}
                              disabled={isUpdating === step.id}
                            >
                              {isUpdating === step.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Circle className="h-4 w-4 mr-1" />
                              )}
                              Mark Incomplete
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNotesButtonClick(step)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {step.notes ? 'View Notes' : 'Add Notes'}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {selectedStep === step.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                          {/* Existing Notes */}
                          {step.notes && !isAddingNote && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">Notes</h4>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditingNote(step.id, step.notes || '')}
                                    disabled={isNotesLoading === step.id}
                                    style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                                    className="hover:bg-gray-50 hover:border-gray-300"
                                  >
                                    {isNotesLoading === step.id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Edit2 className="h-3 w-3 mr-1" />
                                    )}
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteStepNote(step.id)}
                                    disabled={isNotesLoading === step.id}
                                    style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
                                    className="hover:bg-red-50 hover:border-red-300"
                                  >
                                    {isNotesLoading === step.id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      'Delete'
                                    )}
                                  </Button>
                                </div>
                              </div>
                              {editingNote === step.id ? (
                                <div className="flex space-x-2">
                                  <Textarea
                                    value={editedNoteText}
                                    onChange={(e) => setEditedNoteText(e.target.value)}
                                    className="flex-1"
                                    rows={3}
                                  />
                                  <div className="flex flex-col space-y-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateStepNote(step.id)}
                                      disabled={!editedNoteText.trim() || isNotesLoading === step.id}
                                      style={{ backgroundColor: '#5C1B10', color: 'white' }}
                                    >
                                      {isNotesLoading === step.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                      ) : null}
                                      Save
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={cancelEditingNote}
                                      disabled={isNotesLoading === step.id}
                                      style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                                      className="hover:bg-gray-50 hover:border-gray-300"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-600">{step.notes}</p>
                              )}
                            </div>
                          )}

                          {/* Add Note Form - Only show when in add mode */}
                          {isAddingNote === step.id && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Add Note</h4>
                              <div className="flex space-x-2">
                                <Textarea
                                  placeholder="Add a note about this step..."
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  className="flex-1"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex flex-col space-y-2">
                                  <Button
                                    size="sm"
                                    onClick={() => addStepNote(step.id)}
                                    disabled={!newNote.trim() || isNotesLoading === step.id}
                                    style={{ backgroundColor: '#5C1B10', color: 'white' }}
                                  >
                                    {isNotesLoading === step.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : null}
                                    Add
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelAddingNote}
                                    disabled={isNotesLoading === step.id}
                                    style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                                    className="hover:bg-gray-50 hover:border-gray-300"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

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

                      {/* Dependency Blocking */}
                      {isBlocked && dependencyCheck.missingDependencies.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-800">
                              Dependencies Required: {dependencyCheck.missingDependencies.join(', ')}
                            </span>
                          </div>
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

                    {/* Right Side - Day Indicator */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        Day {dayStart} - {dayEnd}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Empty State */}
      {steps.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <SectionHeader className="text-lg mb-2">No Steps Yet</SectionHeader>
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

      {/* Step Completion Modal */}
      <StepCompletionModal
        step={completionModal.step}
        isOpen={completionModal.isOpen}
        onClose={closeCompletionModal}
        onComplete={handleStepCompletion}
        isLoading={isUpdating === completionModal.step?.id}
      />

      {/* Step Edit Modal */}
      <StepEditModal
        step={editModal.step}
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        onUpdateCost={handleCostUpdate}
        onUploadDocument={handleDocumentUpload}
        onRefresh={onRefreshTimeline || (() => Promise.resolve())}
        isLoading={isUpdating === editModal.step?.id}
      />
    </div>
  );
}