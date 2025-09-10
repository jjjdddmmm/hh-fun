// Timeline Service - Production Ready, Zero Tech Debt
// Comprehensive business logic layer for timeline management

import { prisma } from '@/lib/prisma';
import { 
  Timeline,
  TimelineStep,
  TimelineDocument,
  TimelineTeamMember,
  TimelineNote,
  TimelineStepComment,
  StepStatus,
  TimelineStatus,
  StepCategory,
  StepPriority
} from '@prisma/client';
import { 
  TimelineWithRelations,
  TimelineStepWithRelations,
  DEFAULT_TIMELINE_STEPS,
  TimelineProgressStats,
  TimelineCostSummary
} from '@/lib/types/timeline';
import { 
  CreateTimelineInput,
  UpdateTimelineInput,
  CreateTimelineStepInput,
  UpdateTimelineStepInput,
  UploadDocumentInput,
  AddTeamMemberInput,
  CreateNoteInput,
  AddStepCommentInput
} from '@/lib/validation/timeline';

export class TimelineService {
  // ============================================================================
  // TIMELINE MANAGEMENT
  // ============================================================================

  /**
   * Create a new timeline for a property
   */
  async createTimeline(
    userId: string,
    input: CreateTimelineInput
  ): Promise<TimelineWithRelations> {
    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: {
        id: input.propertyId,
        user: { clerkId: userId },
        deletedAt: null
      }
    });

    if (!property) {
      throw new Error('Property not found or access denied');
    }

    // Check if timeline already exists
    const existingTimeline = await prisma.timeline.findUnique({
      where: { propertyId: input.propertyId }
    });

    if (existingTimeline) {
      throw new Error('Timeline already exists for this property');
    }

    // Calculate estimated closing date if not provided
    const estimatedClosingDate = input.estimatedClosingDate || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Create timeline with steps in a transaction
    return await prisma.$transaction(async (tx) => {
      // Create the timeline
      const timeline = await tx.timeline.create({
        data: {
          propertyId: input.propertyId,
          userId: property.userId,
          title: input.title || 'Home Purchase Timeline',
          estimatedClosingDate,
          totalSteps: input.customSteps.length || DEFAULT_TIMELINE_STEPS.length,
        }
      });

      // Use custom steps or default steps
      const stepsToCreate = input.customSteps.length > 0 
        ? input.customSteps 
        : DEFAULT_TIMELINE_STEPS;

      // Create timeline steps
      const steps = await Promise.all(
        stepsToCreate.map(async (step, index) => {
          const scheduledDate = new Date(timeline.startDate);
          scheduledDate.setDate(scheduledDate.getDate() + step.daysFromStart);

          return await tx.timelineStep.create({
            data: {
              timelineId: timeline.id,
              title: step.title,
              description: step.description,
              category: step.category,
              icon: step.icon,
              sortOrder: index,
              daysFromStart: step.daysFromStart,
              estimatedDuration: step.estimatedDuration,
              scheduledDate,
              priority: step.priority || StepPriority.MEDIUM,
              isRequired: step.isRequired ?? true,
              estimatedCost: step.estimatedCost ? BigInt(step.estimatedCost * 100) : null, // Convert to cents
              externalUrl: step.externalUrl,
              status: index === 0 ? StepStatus.CURRENT : StepStatus.UPCOMING,
            },
            include: {
              documents: true,
              comments: true,
            }
          });
        })
      );

      // Return timeline with all relations
      return await tx.timeline.findUniqueOrThrow({
        where: { id: timeline.id },
        include: {
          property: {
            select: {
              id: true,
              address: true,
              price: true,
              city: true,
              state: true,
              zipCode: true,
            }
          },
          steps: {
            include: {
              documents: true,
              comments: true,
            },
            orderBy: { sortOrder: 'asc' }
          },
          documents: true,
          teamMembers: {
            where: { isActive: true },
            orderBy: { isPrimary: 'desc' }
          },
          notes: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });
  }

  /**
   * Get timeline by property ID
   */
  async getTimelineByPropertyId(
    userId: string,
    propertyId: string,
    options: {
      includeSteps?: boolean;
      includeDocuments?: boolean;
      includeTeamMembers?: boolean;
      includeNotes?: boolean;
    } = {}
  ): Promise<TimelineWithRelations | null> {
    const {
      includeSteps = true,
      includeDocuments = false,
      includeTeamMembers = false,
      includeNotes = false
    } = options;

    const timeline = await prisma.timeline.findFirst({
      where: {
        propertyId,
        user: { clerkId: userId }
      },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            price: true,
            city: true,
            state: true,
            zipCode: true,
          }
        },
        steps: includeSteps ? {
          include: {
            documents: true, // Always include documents for step counts
            comments: includeDocuments ? {
              orderBy: { createdAt: 'desc' }
            } : false
          },
          orderBy: { sortOrder: 'asc' }
        } : false,
        documents: includeDocuments,
        teamMembers: includeTeamMembers ? {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' }
        } : false,
        notes: includeNotes ? {
          orderBy: { createdAt: 'desc' }
        } : false
      }
    });

    return timeline as TimelineWithRelations | null;
  }

  /**
   * Get all timelines for a user
   */
  async getUserTimelines(userId: string): Promise<any[]> {
    const timelines = await prisma.timeline.findMany({
      where: {
        user: { clerkId: userId }
      },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            price: true,
            city: true,
            state: true,
            zipCode: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return timelines;
  }

  /**
   * Update timeline
   */
  async updateTimeline(
    userId: string,
    timelineId: string,
    input: UpdateTimelineInput
  ): Promise<TimelineWithRelations> {
    // Verify ownership
    await this.verifyTimelineOwnership(userId, timelineId);

    const timeline = await prisma.timeline.update({
      where: { id: timelineId },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            price: true,
            city: true,
            state: true,
            zipCode: true,
          }
        },
        steps: {
          include: {
            documents: true,
            comments: true,
          },
          orderBy: { sortOrder: 'asc' }
        },
        documents: true,
        teamMembers: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return timeline as TimelineWithRelations;
  }

  /**
   * Delete timeline (soft delete)
   */
  async deleteTimeline(userId: string, timelineId: string): Promise<void> {
    await this.verifyTimelineOwnership(userId, timelineId);
    
    await prisma.timeline.update({
      where: { id: timelineId },
      data: { status: TimelineStatus.CANCELLED }
    });
  }

  // ============================================================================
  // STEP MANAGEMENT
  // ============================================================================

  /**
   * Create a new timeline step
   */
  async createTimelineStep(
    userId: string,
    input: CreateTimelineStepInput
  ): Promise<TimelineStepWithRelations> {
    await this.verifyTimelineOwnership(userId, input.timelineId);

    // Calculate scheduled date
    const timeline = await prisma.timeline.findUniqueOrThrow({
      where: { id: input.timelineId }
    });

    const scheduledDate = new Date(timeline.startDate);
    scheduledDate.setDate(scheduledDate.getDate() + input.daysFromStart);

    // Get next sort order if not provided
    const sortOrder = input.sortOrder ?? await this.getNextSortOrder(input.timelineId);

    const step = await prisma.timelineStep.create({
      data: {
        ...input,
        scheduledDate,
        sortOrder,
        estimatedCost: input.estimatedCost ? BigInt(input.estimatedCost * 100) : null,
      },
      include: {
        documents: true,
        comments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Update timeline total steps count
    await this.updateTimelineProgress(input.timelineId);

    return step as TimelineStepWithRelations;
  }

  /**
   * Update timeline step
   */
  async updateTimelineStep(
    userId: string,
    stepId: string,
    input: UpdateTimelineStepInput
  ): Promise<TimelineStepWithRelations> {
    // Get step and verify ownership
    const step = await prisma.timelineStep.findUniqueOrThrow({
      where: { id: stepId },
      include: { timeline: true }
    });

    await this.verifyTimelineOwnership(userId, step.timelineId);

    // Handle completion logic
    const { isEarlyCompletion, ...dataToUpdate } = input; // Extract isEarlyCompletion, don't save to DB
    const updateData: any = {
      ...dataToUpdate,
      updatedAt: new Date(),
    };

    if (input.actualCost !== undefined) {
      updateData.actualCost = input.actualCost ? BigInt(input.actualCost) : null;
    }

    // Handle step completion and current step advancement in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Auto-set status based on completion
      if (input.isCompleted === true && !input.status) {
        updateData.status = StepStatus.COMPLETED;
        updateData.actualEndDate = input.actualEndDate || new Date();
      } else if (input.isCompleted === false) {
        updateData.status = StepStatus.UPCOMING; // Will be corrected later by current step logic
        updateData.actualEndDate = null;
      }

      // Update the current step
      const updatedStep = await tx.timelineStep.update({
        where: { id: stepId },
        data: updateData,
        include: {
          documents: true,
          comments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Handle current step advancement based on completion type
      if (input.isCompleted === true) {
        if (isEarlyCompletion === true) {
          // Early completion: mark step as completed but don't advance current step pointer
          // The step is completed out of sequence, so we keep the current step where it is
        } else {
          // Normal completion: advance the current step pointer
          // Find the next incomplete step in sort order
          const nextIncompleteStep = await tx.timelineStep.findFirst({
            where: {
              timelineId: step.timelineId,
              isCompleted: false,
              sortOrder: {
                gt: step.sortOrder
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          });

          if (nextIncompleteStep) {
            // Set the next step as current
            await tx.timelineStep.update({
              where: { id: nextIncompleteStep.id },
              data: { status: StepStatus.CURRENT }
            });

            // Set all other incomplete steps (except the new current one) as upcoming
            await tx.timelineStep.updateMany({
              where: {
                timelineId: step.timelineId,
                isCompleted: false,
                id: { not: nextIncompleteStep.id }
              },
              data: { status: StepStatus.UPCOMING }
            });
          }
        }
      } else if (input.isCompleted === false) {
        // Mark step incomplete: handle document versioning and update step status
        
        // Handle document version cleanup when step becomes incomplete
        const { documentVersionService } = await import('./DocumentVersionService');
        await documentVersionService.handleStepIncomplete(stepId);
        
        // Mark step incomplete: find earliest UPCOMING step and make it CURRENT
        // First, set all non-completed steps to UPCOMING
        await tx.timelineStep.updateMany({
          where: {
            timelineId: step.timelineId,
            isCompleted: false
          },
          data: { status: StepStatus.UPCOMING }
        });

        // Find the earliest incomplete step (by sortOrder) to become CURRENT
        const earliestIncompleteStep = await tx.timelineStep.findFirst({
          where: {
            timelineId: step.timelineId,
            isCompleted: false
          },
          orderBy: {
            sortOrder: 'asc'
          }
        });

        // Set the earliest incomplete step as CURRENT
        if (earliestIncompleteStep) {
          await tx.timelineStep.update({
            where: { id: earliestIncompleteStep.id },
            data: { status: StepStatus.CURRENT }
          });
        }
      }

      return updatedStep;
    }, {
      timeout: 15000 // Increase timeout to 15 seconds
    });

    // Update timeline progress
    await this.updateTimelineProgress(step.timelineId);

    return result as TimelineStepWithRelations;
  }

  /**
   * Reorder timeline steps
   */
  async reorderSteps(
    userId: string,
    timelineId: string,
    stepUpdates: Array<{ stepId: string; sortOrder: number }>
  ): Promise<void> {
    await this.verifyTimelineOwnership(userId, timelineId);

    await prisma.$transaction(async (tx) => {
      for (const update of stepUpdates) {
        await tx.timelineStep.update({
          where: { 
            id: update.stepId,
            timelineId // Ensure step belongs to timeline
          },
          data: { sortOrder: update.sortOrder }
        });
      }
    });
  }

  /**
   * Delete timeline step
   */
  async deleteTimelineStep(userId: string, stepId: string): Promise<void> {
    const step = await prisma.timelineStep.findUniqueOrThrow({
      where: { id: stepId },
      include: { timeline: true }
    });

    await this.verifyTimelineOwnership(userId, step.timelineId);

    await prisma.timelineStep.delete({
      where: { id: stepId }
    });

    // Update timeline progress
    await this.updateTimelineProgress(step.timelineId);
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT
  // ============================================================================

  /**
   * Upload document
   */
  async uploadDocument(
    userId: string,
    input: UploadDocumentInput
  ): Promise<TimelineDocument> {
    await this.verifyTimelineOwnership(userId, input.timelineId);

    // Verify step belongs to timeline if provided
    if (input.stepId) {
      const step = await prisma.timelineStep.findFirst({
        where: {
          id: input.stepId,
          timelineId: input.timelineId
        }
      });

      if (!step) {
        throw new Error('Step not found or does not belong to timeline');
      }
    }

    return await prisma.timelineDocument.create({
      data: {
        ...input,
        uploadedBy: userId,
      }
    });
  }

  /**
   * Get documents for timeline or step
   */
  async getDocuments(
    userId: string,
    timelineId: string,
    stepId?: string
  ): Promise<TimelineDocument[]> {
    await this.verifyTimelineOwnership(userId, timelineId);

    return await prisma.timelineDocument.findMany({
      where: {
        timelineId,
        ...(stepId && { stepId })
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create document record (for Cloudinary uploads)
   */
  async createDocument(
    userId: string,
    input: {
      timelineId: string;
      stepId?: string;
      fileName: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      documentType: string;
      storageProvider: string;
      storageKey: string;
      downloadUrl: string;
      thumbnailUrl?: string;
      uploadedBy: string;
      completionSessionId?: string;
    }
  ): Promise<TimelineDocument> {
    await this.verifyTimelineOwnership(userId, input.timelineId);

    // Verify step belongs to timeline if provided
    if (input.stepId) {
      const step = await prisma.timelineStep.findFirst({
        where: {
          id: input.stepId,
          timelineId: input.timelineId
        }
      });

      if (!step) {
        throw new Error('Step not found or does not belong to timeline');
      }
    }

    // Create the document
    const document = await prisma.timelineDocument.create({
      data: {
        timelineId: input.timelineId,
        stepId: input.stepId,
        fileName: input.fileName,
        originalName: input.originalName,
        mimeType: input.mimeType,
        fileSize: BigInt(input.fileSize), // Convert to BigInt for database
        documentType: input.documentType as any, // Cast to enum
        storageProvider: input.storageProvider as any, // Cast to enum
        storageKey: input.storageKey,
        downloadUrl: input.downloadUrl,
        thumbnailUrl: input.thumbnailUrl,
        uploadedBy: input.uploadedBy,
        completionSessionId: input.completionSessionId,
      }
    });

    // Handle document versioning if this is part of a completion session
    if (input.completionSessionId && input.stepId) {
      const { documentVersionService } = await import('./DocumentVersionService');
      await documentVersionService.handleDocumentVersioning(
        input.stepId,
        input.documentType,
        document.id,
        input.completionSessionId
      );
    }

    return document;
  }

  /**
   * Delete document
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const document = await prisma.timelineDocument.findUniqueOrThrow({
      where: { id: documentId },
      include: { timeline: true }
    });

    await this.verifyTimelineOwnership(userId, document.timelineId);

    await prisma.timelineDocument.delete({
      where: { id: documentId }
    });
  }

  // ============================================================================
  // TEAM MEMBER MANAGEMENT
  // ============================================================================

  /**
   * Add team member
   */
  async addTeamMember(
    userId: string,
    input: AddTeamMemberInput
  ): Promise<TimelineTeamMember> {
    await this.verifyTimelineOwnership(userId, input.timelineId);

    // If setting as primary, unset other primary members for this role
    if (input.isPrimary) {
      await prisma.timelineTeamMember.updateMany({
        where: {
          timelineId: input.timelineId,
          role: input.role,
          isPrimary: true
        },
        data: { isPrimary: false }
      });
    }

    return await prisma.timelineTeamMember.create({
      data: input
    });
  }

  /**
   * Update team member
   */
  async updateTeamMember(
    userId: string,
    memberId: string,
    input: Partial<AddTeamMemberInput>
  ): Promise<TimelineTeamMember> {
    const member = await prisma.timelineTeamMember.findUniqueOrThrow({
      where: { id: memberId },
      include: { timeline: true }
    });

    await this.verifyTimelineOwnership(userId, member.timelineId);

    // Handle primary role logic
    if (input.isPrimary) {
      await prisma.timelineTeamMember.updateMany({
        where: {
          timelineId: member.timelineId,
          role: member.role,
          isPrimary: true,
          id: { not: memberId }
        },
        data: { isPrimary: false }
      });
    }

    return await prisma.timelineTeamMember.update({
      where: { id: memberId },
      data: {
        ...input,
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Remove team member
   */
  async removeTeamMember(userId: string, memberId: string): Promise<void> {
    const member = await prisma.timelineTeamMember.findUniqueOrThrow({
      where: { id: memberId },
      include: { timeline: true }
    });

    await this.verifyTimelineOwnership(userId, member.timelineId);

    await prisma.timelineTeamMember.update({
      where: { id: memberId },
      data: { isActive: false }
    });
  }

  // ============================================================================
  // NOTE MANAGEMENT
  // ============================================================================

  /**
   * Create note
   */
  async createNote(
    userId: string,
    input: CreateNoteInput,
    authorName: string
  ): Promise<TimelineNote> {
    await this.verifyTimelineOwnership(userId, input.timelineId);

    return await prisma.timelineNote.create({
      data: {
        ...input,
        authorId: userId,
        authorName,
      }
    });
  }

  /**
   * Update note
   */
  async updateNote(
    userId: string,
    noteId: string,
    input: Partial<CreateNoteInput>
  ): Promise<TimelineNote> {
    const note = await prisma.timelineNote.findUniqueOrThrow({
      where: { id: noteId },
      include: { timeline: true }
    });

    // Only author or timeline owner can update
    if (note.authorId !== userId) {
      await this.verifyTimelineOwnership(userId, note.timelineId);
    }

    return await prisma.timelineNote.update({
      where: { id: noteId },
      data: {
        ...input,
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Delete note
   */
  async deleteNote(userId: string, noteId: string): Promise<void> {
    const note = await prisma.timelineNote.findUniqueOrThrow({
      where: { id: noteId },
      include: { timeline: true }
    });

    // Only author or timeline owner can delete
    if (note.authorId !== userId) {
      await this.verifyTimelineOwnership(userId, note.timelineId);
    }

    await prisma.timelineNote.delete({
      where: { id: noteId }
    });
  }

  // ============================================================================
  // COMMENT MANAGEMENT
  // ============================================================================

  /**
   * Add step comment
   */
  async addStepComment(
    userId: string,
    input: AddStepCommentInput,
    authorName: string
  ): Promise<TimelineStepComment> {
    const step = await prisma.timelineStep.findUniqueOrThrow({
      where: { id: input.stepId },
      include: { timeline: true }
    });

    await this.verifyTimelineOwnership(userId, step.timelineId);

    return await prisma.timelineStepComment.create({
      data: {
        ...input,
        authorId: userId,
        authorName,
      }
    });
  }

  /**
   * Update step comment
   */
  async updateStepComment(
    userId: string,
    commentId: string,
    content: string
  ): Promise<TimelineStepComment> {
    const comment = await prisma.timelineStepComment.findUniqueOrThrow({
      where: { id: commentId },
      include: { 
        step: { 
          include: { timeline: true } 
        } 
      }
    });

    // Only author or timeline owner can update
    if (comment.authorId !== userId) {
      await this.verifyTimelineOwnership(userId, comment.step.timelineId);
    }

    return await prisma.timelineStepComment.update({
      where: { id: commentId },
      data: {
        content,
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Delete step comment
   */
  async deleteStepComment(userId: string, commentId: string): Promise<void> {
    const comment = await prisma.timelineStepComment.findUniqueOrThrow({
      where: { id: commentId },
      include: { 
        step: { 
          include: { timeline: true } 
        } 
      }
    });

    // Only author or timeline owner can delete
    if (comment.authorId !== userId) {
      await this.verifyTimelineOwnership(userId, comment.step.timelineId);
    }

    await prisma.timelineStepComment.delete({
      where: { id: commentId }
    });
  }

  // ============================================================================
  // ANALYTICS & REPORTING
  // ============================================================================

  /**
   * Get timeline progress statistics
   */
  async getProgressStats(userId: string, timelineId: string): Promise<TimelineProgressStats> {
    await this.verifyTimelineOwnership(userId, timelineId);

    const timeline = await prisma.timeline.findUniqueOrThrow({
      where: { id: timelineId },
      include: {
        steps: true
      }
    });

    const totalSteps = timeline.steps.length;
    const completedSteps = timeline.steps.filter(s => s.status === StepStatus.COMPLETED).length;
    const upcomingSteps = timeline.steps.filter(s => s.status === StepStatus.UPCOMING).length;
    const overdue = timeline.steps.filter(s => 
      s.status !== StepStatus.COMPLETED && 
      s.scheduledDate && 
      new Date(s.scheduledDate) < new Date()
    ).length;
    const blocked = timeline.steps.filter(s => s.isBlocked).length;

    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Calculate estimated days remaining
    const remainingSteps = timeline.steps.filter(s => s.status !== StepStatus.COMPLETED);
    const estimatedDaysRemaining = remainingSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);

    // Determine if on track
    const onTrack = overdue === 0 && blocked === 0;

    return {
      totalSteps,
      completedSteps,
      upcomingSteps,
      overdue,
      blocked,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      estimatedDaysRemaining,
      onTrack
    };
  }

  /**
   * Get cost summary
   */
  async getCostSummary(userId: string, timelineId: string): Promise<TimelineCostSummary> {
    await this.verifyTimelineOwnership(userId, timelineId);

    const steps = await prisma.timelineStep.findMany({
      where: { timelineId },
      select: {
        category: true,
        estimatedCost: true,
        actualCost: true,
        status: true
      }
    });


    const estimatedTotal = steps.reduce((sum, step) => {
      return sum + (step.estimatedCost ? Number(step.estimatedCost) / 100 : 0);
    }, 0);

    const actualTotal = steps.reduce((sum, step) => {
      return sum + (step.actualCost ? Number(step.actualCost) / 100 : 0);
    }, 0);

    const remainingSteps = steps.filter(s => s.status !== StepStatus.COMPLETED);
    const remainingEstimated = remainingSteps.reduce((sum, step) => {
      return sum + (step.estimatedCost ? Number(step.estimatedCost) / 100 : 0);
    }, 0);

    const byCategory: Record<StepCategory, number> = {} as Record<StepCategory, number>;
    Object.values(StepCategory).forEach(category => {
      byCategory[category] = steps
        .filter(s => s.category === category)
        .reduce((sum, step) => {
          return sum + ((step.actualCost || step.estimatedCost) ? Number(step.actualCost || step.estimatedCost) / 100 : 0);
        }, 0);
    });

    return {
      estimatedTotal,
      actualTotal,
      remainingEstimated,
      byCategory
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Verify timeline ownership
   */
  private async verifyTimelineOwnership(userId: string, timelineId: string): Promise<void> {
    const timeline = await prisma.timeline.findFirst({
      where: {
        id: timelineId,
        user: { clerkId: userId }
      }
    });

    if (!timeline) {
      throw new Error('Timeline not found or access denied');
    }
  }

  /**
   * Get next sort order for timeline steps
   */
  private async getNextSortOrder(timelineId: string): Promise<number> {
    const lastStep = await prisma.timelineStep.findFirst({
      where: { timelineId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });

    return (lastStep?.sortOrder ?? -1) + 1;
  }

  /**
   * Update timeline progress and statistics
   */
  private async updateTimelineProgress(timelineId: string): Promise<void> {
    const steps = await prisma.timelineStep.findMany({
      where: { timelineId },
      select: { status: true }
    });

    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === StepStatus.COMPLETED).length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    await prisma.timeline.update({
      where: { id: timelineId },
      data: {
        totalSteps,
        completedSteps,
        progressPercentage,
        updatedAt: new Date(),
      }
    });
  }
}

// Export singleton instance
export const timelineService = new TimelineService();