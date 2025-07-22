// Timeline System Types - Production Ready, Zero Tech Debt
// Comprehensive type definitions for the home buying timeline system

import { 
  Timeline, 
  TimelineStep, 
  TimelineDocument, 
  TimelineTeamMember, 
  TimelineNote,
  TimelineStepComment,
  TimelineStatus,
  StepStatus,
  StepCategory,
  StepPriority,
  DocumentType,
  TeamMemberRole,
  ContactMethod,
  NoteType,
  CommentType
} from '@prisma/client';

// ============================================================================
// CORE TIMELINE TYPES
// ============================================================================

export interface TimelineWithRelations extends Timeline {
  property: {
    id: string;
    address: string;
    price: bigint;
    city: string;
    state: string;
    zipCode: string;
  };
  steps: TimelineStepWithRelations[];
  documents: TimelineDocumentWithRelations[];
  teamMembers: TimelineTeamMember[];
  notes: TimelineNote[];
}

export interface TimelineStepWithRelations extends TimelineStep {
  documents: TimelineDocument[];
  comments: TimelineStepComment[];
}

export interface TimelineDocumentWithRelations extends TimelineDocument {
  step?: TimelineStep;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateTimelineRequest {
  propertyId: string;
  title?: string;
  estimatedClosingDate?: string; // ISO date string
  customSteps?: Partial<CreateTimelineStepRequest>[];
}

export interface CreateTimelineResponse {
  success: boolean;
  timeline?: TimelineWithRelations;
  error?: string;
}

export interface CreateTimelineStepRequest {
  title: string;
  description: string;
  category: StepCategory;
  icon: string;
  daysFromStart: number;
  estimatedDuration: number;
  priority?: StepPriority;
  isRequired?: boolean;
  estimatedCost?: number; // In dollars, will be converted to cents
  externalUrl?: string;
}

export interface UpdateTimelineStepRequest {
  title?: string;
  description?: string;
  status?: StepStatus;
  notes?: string;
  isCompleted?: boolean;
  isBlocked?: boolean;
  blockReason?: string;
  actualStartDate?: string; // ISO date string
  actualEndDate?: string; // ISO date string
  actualCost?: number; // In dollars, will be converted to cents
  priority?: StepPriority;
}

export interface UploadDocumentRequest {
  timelineId: string;
  stepId?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  documentType: DocumentType;
  description?: string;
  tags?: string[];
  isRequired?: boolean;
}

export interface AddTeamMemberRequest {
  timelineId: string;
  name: string;
  role: TeamMemberRole;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  licenseNumber?: string;
  specialties?: string[];
  preferredContact?: ContactMethod;
  availability?: string;
  timezone?: string;
  isPrimary?: boolean;
  recommendedBy?: string;
  notes?: string;
}

export interface CreateNoteRequest {
  timelineId: string;
  title?: string;
  content: string;
  noteType?: NoteType;
  tags?: string[];
  isImportant?: boolean;
  isPrivate?: boolean;
}

export interface AddStepCommentRequest {
  stepId: string;
  content: string;
  commentType?: CommentType;
}

// ============================================================================
// DEFAULT TIMELINE CONFIGURATION
// ============================================================================

export interface DefaultTimelineStep {
  title: string;
  description: string;
  daysFromStart: number;
  estimatedDuration: number;
  category: StepCategory;
  icon: string;
  priority: StepPriority;
  isRequired: boolean;
  estimatedCost?: number; // In dollars
  externalUrl?: string;
  dependencies?: string[]; // Step titles that must be completed first
}

export const DEFAULT_TIMELINE_STEPS: DefaultTimelineStep[] = [
  {
    title: "Offer Accepted",
    description: "Your offer has been accepted by the seller. The home buying process officially begins! Celebrate this milestone and prepare for the journey ahead.",
    daysFromStart: 0,
    estimatedDuration: 1,
    category: StepCategory.LEGAL,
    icon: "CheckCircle",
    priority: StepPriority.CRITICAL,
    isRequired: true,
  },
  {
    title: "Purchase Contract Review",
    description: "Carefully review and sign the purchase agreement with all terms and conditions. Ensure you understand all clauses, contingencies, and deadlines.",
    daysFromStart: 1,
    estimatedDuration: 2,
    category: StepCategory.LEGAL,
    icon: "FileText",
    priority: StepPriority.HIGH,
    isRequired: true,
    dependencies: ["Offer Accepted"],
  },
  {
    title: "Submit Earnest Money",
    description: "Submit earnest money deposit to show serious intent to purchase. This demonstrates good faith and secures your position as a buyer.",
    daysFromStart: 2,
    estimatedDuration: 1,
    category: StepCategory.PAPERWORK,
    icon: "DollarSign",
    priority: StepPriority.HIGH,
    isRequired: true,
    estimatedCost: 5000, // Typical earnest money amount
    dependencies: ["Purchase Contract Review"],
  },
  {
    title: "Submit Mortgage Application",
    description: "Complete and submit your mortgage application with all required documents. Provide accurate information and respond quickly to lender requests.",
    daysFromStart: 3,
    estimatedDuration: 3,
    category: StepCategory.FINANCING,
    icon: "Building",
    priority: StepPriority.CRITICAL,
    isRequired: true,
  },
  {
    title: "Schedule Home Inspection",
    description: "Hire a qualified professional inspector to examine the property for potential issues. This is your opportunity to identify problems before closing.",
    daysFromStart: 7,
    estimatedDuration: 5,
    category: StepCategory.INSPECTION,
    icon: "Search",
    priority: StepPriority.HIGH,
    isRequired: true,
    estimatedCost: 500, // Typical inspection cost
    dependencies: ["Purchase Contract Review"],
  },
  {
    title: "Property Appraisal",
    description: "Lender orders an appraisal to determine the home's market value. This ensures the loan amount aligns with the property's worth.",
    daysFromStart: 10,
    estimatedDuration: 3,
    category: StepCategory.FINANCING,
    icon: "TrendingUp",
    priority: StepPriority.HIGH,
    isRequired: true,
    estimatedCost: 400, // Typical appraisal cost
    dependencies: ["Purchase Contract Review"],
  },
  {
    title: "Inspection Issues Resolution",
    description: "Address any issues found during inspection through negotiations or repairs. Work with your agent to determine the best course of action.",
    daysFromStart: 12,
    estimatedDuration: 5,
    category: StepCategory.INSPECTION,
    icon: "Wrench",
    priority: StepPriority.MEDIUM,
    isRequired: false, // Only if inspection reveals issues
    dependencies: ["Schedule Home Inspection"],
  },
  {
    title: "Mortgage Underwriting",
    description: "Lender reviews and processes your mortgage application for final approval. Be responsive to any additional documentation requests.",
    daysFromStart: 15,
    estimatedDuration: 7,
    category: StepCategory.FINANCING,
    icon: "Shield",
    priority: StepPriority.CRITICAL,
    isRequired: true,
    dependencies: ["Submit Mortgage Application"],
  },
  {
    title: "Final Walkthrough",
    description: "Conduct final inspection of the property before closing. Verify that agreed-upon repairs are complete and the property is in expected condition.",
    daysFromStart: 28,
    estimatedDuration: 1,
    category: StepCategory.INSPECTION,
    icon: "Eye",
    priority: StepPriority.HIGH,
    isRequired: true,
    dependencies: ["Inspection Issues Resolution"],
  },
  {
    title: "Closing Day",
    description: "Sign final documents, complete the transaction, and get your keys! Review all documents carefully and celebrate becoming a homeowner!",
    daysFromStart: 30,
    estimatedDuration: 1,
    category: StepCategory.CLOSING,
    icon: "Key",
    priority: StepPriority.CRITICAL,
    isRequired: true,
    estimatedCost: 3000, // Typical closing costs estimate
    dependencies: [
      "Offer Accepted",
      "Purchase Contract Review", 
      "Submit Earnest Money",
      "Submit Mortgage Application",
      "Schedule Home Inspection",
      "Property Appraisal",
      "Inspection Issues Resolution",
      "Mortgage Underwriting",
      "Final Walkthrough"
    ],
  },
];

// ============================================================================
// DEPENDENCY UTILITIES
// ============================================================================

export function checkStepDependencies(
  step: TimelineStepWithRelations,
  allSteps: TimelineStepWithRelations[]
): { canComplete: boolean; missingDependencies: string[] } {
  // Find the default step configuration for this step
  const defaultStep = DEFAULT_TIMELINE_STEPS.find(ds => ds.title === step.title);
  
  if (!defaultStep?.dependencies || defaultStep.dependencies.length === 0) {
    return { canComplete: true, missingDependencies: [] };
  }

  const missingDependencies: string[] = [];
  
  for (const depTitle of defaultStep.dependencies) {
    const dependentStep = allSteps.find(s => s.title === depTitle);
    if (!dependentStep?.isCompleted) {
      missingDependencies.push(depTitle);
    }
  }

  return {
    canComplete: missingDependencies.length === 0,
    missingDependencies
  };
}

// ============================================================================
// UTILITY TYPES & FUNCTIONS
// ============================================================================

export interface TimelineProgressStats {
  totalSteps: number;
  completedSteps: number;
  upcomingSteps: number;
  overdue: number;
  blocked: number;
  progressPercentage: number;
  estimatedDaysRemaining: number;
  onTrack: boolean;
}

export interface TimelineCostSummary {
  estimatedTotal: number;
  actualTotal: number;
  remainingEstimated: number;
  byCategory: Record<StepCategory, number>;
}

export interface TimelineFilters {
  status?: StepStatus[];
  category?: StepCategory[];
  priority?: StepPriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

// Form validation schemas will be defined separately with Zod
export type TimelineFormData = {
  title: string;
  estimatedClosingDate: Date;
  customSteps: CreateTimelineStepRequest[];
};

export type StepFormData = Omit<UpdateTimelineStepRequest, 'actualStartDate' | 'actualEndDate'> & {
  actualStartDate?: Date;
  actualEndDate?: Date;
};

// Export all Prisma types for convenience
export type {
  Timeline,
  TimelineStep,
  TimelineDocument,
  TimelineTeamMember,
  TimelineNote,
  TimelineStepComment,
};

// Export enums as values
export {
  TimelineStatus,
  StepStatus,
  StepCategory,
  StepPriority,
  DocumentType,
  TeamMemberRole,
  ContactMethod,
  NoteType,
  CommentType,
};