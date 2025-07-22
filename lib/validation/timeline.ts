// Timeline System Validation Schemas - Production Ready, Zero Tech Debt
// Comprehensive Zod schemas for all timeline-related API endpoints

import { z } from 'zod';
import { 
  StepCategory, 
  StepStatus, 
  StepPriority, 
  DocumentType, 
  TeamMemberRole, 
  ContactMethod, 
  NoteType, 
  CommentType,
  TimelineStatus 
} from '@prisma/client';

// ============================================================================
// ENUM VALIDATION SCHEMAS
// ============================================================================

export const timelineStatusSchema = z.nativeEnum(TimelineStatus);
export const stepCategorySchema = z.nativeEnum(StepCategory);
export const stepStatusSchema = z.nativeEnum(StepStatus);
export const stepPrioritySchema = z.nativeEnum(StepPriority);
export const documentTypeSchema = z.nativeEnum(DocumentType);
export const teamMemberRoleSchema = z.nativeEnum(TeamMemberRole);
export const contactMethodSchema = z.nativeEnum(ContactMethod);
export const noteTypeSchema = z.nativeEnum(NoteType);
export const commentTypeSchema = z.nativeEnum(CommentType);

// ============================================================================
// COMMON VALIDATION PATTERNS
// ============================================================================

const cuidSchema = z.string().cuid('Invalid ID format');
const emailSchema = z.string().email('Invalid email format').optional();
const phoneSchema = z.string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .optional();
const urlSchema = z.string().url('Invalid URL format').optional();
const nonEmptyStringSchema = z.string().min(1, 'This field is required');
const positiveIntSchema = z.number().int().positive('Must be a positive integer');
const nonNegativeIntSchema = z.number().int().min(0, 'Must be non-negative');
const currencySchema = z.number().min(0, 'Amount must be non-negative');
const percentageSchema = z.number().min(0).max(100, 'Must be between 0 and 100');

// Date validation that accepts both Date objects and ISO strings
const dateSchema = z.union([
  z.date(),
  z.string().datetime('Invalid date format')
]).transform((val) => {
  if (typeof val === 'string') {
    return new Date(val);
  }
  return val;
});

// ============================================================================
// TIMELINE VALIDATION SCHEMAS
// ============================================================================

export const createTimelineSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional()
    .default('Home Purchase Timeline'),
  estimatedClosingDate: dateSchema.optional(),
  customSteps: z.array(z.object({
    title: nonEmptyStringSchema.max(100, 'Title must be less than 100 characters'),
    description: nonEmptyStringSchema.max(500, 'Description must be less than 500 characters'),
    category: stepCategorySchema,
    icon: nonEmptyStringSchema.max(50, 'Icon name must be less than 50 characters'),
    daysFromStart: nonNegativeIntSchema,
    estimatedDuration: positiveIntSchema,
    priority: stepPrioritySchema.optional().default(StepPriority.MEDIUM),
    isRequired: z.boolean().optional().default(true),
    estimatedCost: currencySchema.optional(),
    externalUrl: urlSchema,
  })).optional().default([]),
}).strict();

export const updateTimelineSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  status: timelineStatusSchema.optional(),
  estimatedClosingDate: dateSchema.optional(),
  actualClosingDate: dateSchema.optional(),
}).strict();

// ============================================================================
// TIMELINE STEP VALIDATION SCHEMAS
// ============================================================================

export const createTimelineStepSchema = z.object({
  timelineId: cuidSchema,
  title: nonEmptyStringSchema.max(100, 'Title must be less than 100 characters'),
  description: nonEmptyStringSchema.max(500, 'Description must be less than 500 characters'),
  category: stepCategorySchema,
  icon: nonEmptyStringSchema.max(50, 'Icon name must be less than 50 characters'),
  daysFromStart: nonNegativeIntSchema,
  estimatedDuration: positiveIntSchema,
  priority: stepPrioritySchema.optional().default(StepPriority.MEDIUM),
  isRequired: z.boolean().optional().default(true),
  estimatedCost: currencySchema.optional(),
  externalUrl: urlSchema,
  sortOrder: nonNegativeIntSchema.optional(),
}).strict();

export const updateTimelineStepSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .optional(),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  status: stepStatusSchema.optional(),
  notes: z.union([
    z.string().max(1000, 'Notes must be less than 1000 characters'),
    z.null()
  ]).optional(),
  isCompleted: z.boolean().optional(),
  isEarlyCompletion: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  blockReason: z.string()
    .max(200, 'Block reason must be less than 200 characters')
    .optional(),
  actualStartDate: dateSchema.optional(),
  actualEndDate: dateSchema.optional(),
  actualCost: currencySchema.optional(),
  priority: stepPrioritySchema.optional(),
  completedBy: z.string()
    .max(100, 'Completed by must be less than 100 characters')
    .optional(),
  externalUrl: urlSchema,
  sortOrder: nonNegativeIntSchema.optional(),
}).strict()
  .refine((data) => {
    // If step is blocked, block reason is required
    if (data.isBlocked === true && (!data.blockReason || data.blockReason.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: 'Block reason is required when step is blocked',
    path: ['blockReason']
  })
  .refine((data) => {
    // If step is completed, actual end date should be provided
    if (data.isCompleted === true && !data.actualEndDate) {
      return false;
    }
    return true;
  }, {
    message: 'Actual end date is required when step is completed',
    path: ['actualEndDate']
  })
  .refine((data) => {
    // Actual end date must be after actual start date
    if (data.actualStartDate && data.actualEndDate) {
      return new Date(data.actualEndDate) >= new Date(data.actualStartDate);
    }
    return true;
  }, {
    message: 'End date must be after start date',
    path: ['actualEndDate']
  });

export const reorderStepsSchema = z.object({
  stepUpdates: z.array(z.object({
    stepId: cuidSchema,
    sortOrder: nonNegativeIntSchema,
  }))
    .min(1, 'At least one step update is required')
    .max(50, 'Too many steps to reorder'),
}).strict();

// ============================================================================
// DOCUMENT VALIDATION SCHEMAS
// ============================================================================

export const uploadDocumentSchema = z.object({
  timelineId: cuidSchema,
  stepId: cuidSchema.optional(),
  fileName: nonEmptyStringSchema.max(255, 'File name must be less than 255 characters'),
  originalName: nonEmptyStringSchema.max(255, 'Original name must be less than 255 characters'),
  mimeType: nonEmptyStringSchema.max(100, 'MIME type must be less than 100 characters'),
  fileSize: z.number()
    .int()
    .positive('File size must be positive')
    .max(50 * 1024 * 1024, 'File size must be less than 50MB'), // 50MB limit
  documentType: documentTypeSchema,
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  isRequired: z.boolean().optional().default(false),
  storageProvider: nonEmptyStringSchema.max(50, 'Storage provider must be less than 50 characters'),
  storageKey: nonEmptyStringSchema.max(500, 'Storage key must be less than 500 characters'),
  downloadUrl: z.string().min(1, 'Download URL is required'),
  thumbnailUrl: z.string().optional(),
}).strict();

export const updateDocumentSchema = z.object({
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  isRequired: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  verifiedBy: z.string()
    .max(100, 'Verified by must be less than 100 characters')
    .optional(),
}).strict();

// ============================================================================
// TEAM MEMBER VALIDATION SCHEMAS
// ============================================================================

// Base team member fields (without validation)
const teamMemberFields = {
  name: nonEmptyStringSchema.max(100, 'Name must be less than 100 characters'),
  role: teamMemberRoleSchema,
  company: z.string()
    .max(100, 'Company must be less than 100 characters')
    .optional(),
  email: emailSchema,
  phone: phoneSchema,
  website: urlSchema,
  licenseNumber: z.string()
    .max(50, 'License number must be less than 50 characters')
    .optional(),
  specialties: z.array(z.string().max(100, 'Specialty must be less than 100 characters'))
    .max(10, 'Maximum 10 specialties allowed')
    .optional()
    .default([]),
  rating: z.number()
    .min(0, 'Rating must be at least 0')
    .max(5, 'Rating must be at most 5')
    .optional(),
  preferredContact: contactMethodSchema.optional().default(ContactMethod.EMAIL),
  availability: z.string()
    .max(200, 'Availability must be less than 200 characters')
    .optional(),
  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional(),
  isPrimary: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  recommendedBy: z.string()
    .max(100, 'Recommended by must be less than 100 characters')
    .optional(),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
};

export const addTeamMemberSchema = z.object({
  timelineId: cuidSchema,
  ...teamMemberFields,
}).strict()
  .refine((data) => {
    // At least one contact method (email or phone) is required
    return data.email || data.phone;
  }, {
    message: 'Either email or phone number is required',
    path: ['email']
  });

export const updateTeamMemberSchema = z.object({
  ...teamMemberFields,
  lastContact: dateSchema.optional(),
}).partial().strict();

// ============================================================================
// NOTE VALIDATION SCHEMAS
// ============================================================================

export const createNoteSchema = z.object({
  timelineId: cuidSchema,
  title: z.string()
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  content: nonEmptyStringSchema.max(5000, 'Content must be less than 5000 characters'),
  noteType: noteTypeSchema.optional().default(NoteType.GENERAL),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  isImportant: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(false),
}).strict();

export const updateNoteSchema = createNoteSchema
  .omit({ timelineId: true })
  .partial()
  .strict();

// ============================================================================
// COMMENT VALIDATION SCHEMAS
// ============================================================================

export const addStepCommentSchema = z.object({
  stepId: cuidSchema,
  content: nonEmptyStringSchema.max(2000, 'Comment must be less than 2000 characters'),
  commentType: commentTypeSchema.optional().default(CommentType.UPDATE),
}).strict();

export const updateCommentSchema = z.object({
  content: nonEmptyStringSchema.max(2000, 'Comment must be less than 2000 characters'),
}).strict();

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

// Simplified, robust timeline query schema
export const timelineQuerySchema = z.object({
  propertyId: z.string().optional(),
  includeSteps: z.string().optional().transform(val => val !== 'false'),
  includeDocuments: z.string().optional().transform(val => val === 'true'), 
  includeTeamMembers: z.string().optional().transform(val => val === 'true'),
  includeNotes: z.string().optional().transform(val => val === 'true'),
}).passthrough().transform((data) => ({
  propertyId: data.propertyId,
  includeSteps: data.includeSteps ?? true,
  includeDocuments: data.includeDocuments ?? false,
  includeTeamMembers: data.includeTeamMembers ?? false,
  includeNotes: data.includeNotes ?? false,
}));

export const stepsQuerySchema = z.object({
  timelineId: cuidSchema,
  status: z.union([
    stepStatusSchema,
    z.array(stepStatusSchema)
  ]).optional(),
  category: z.union([
    stepCategorySchema,
    z.array(stepCategorySchema)
  ]).optional(),
  priority: z.union([
    stepPrioritySchema,
    z.array(stepPrioritySchema)
  ]).optional(),
  includeDocuments: z.string()
    .optional()
    .transform((val) => val === 'true'),
  includeComments: z.string()
    .optional()
    .transform((val) => val === 'true'),
  sortBy: z.enum(['sortOrder', 'daysFromStart', 'scheduledDate', 'priority'])
    .optional()
    .default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const documentsQuerySchema = z.object({
  timelineId: cuidSchema,
  stepId: cuidSchema.optional(),
  documentType: z.union([
    documentTypeSchema,
    z.array(documentTypeSchema)
  ]).optional(),
  tags: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'fileName', 'documentType', 'fileSize'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

export const bulkUpdateStepsSchema = z.object({
  stepIds: z.array(cuidSchema).min(1, 'At least one step ID is required'),
  updates: z.object({
    status: stepStatusSchema.optional(),
    priority: stepPrioritySchema.optional(),
    isCompleted: z.boolean().optional(),
    completedBy: z.string().max(100).optional(),
  }).strict(),
}).strict();

export const bulkDeleteDocumentsSchema = z.object({
  documentIds: z.array(cuidSchema).min(1, 'At least one document ID is required'),
}).strict();

// ============================================================================
// FILE UPLOAD VALIDATION
// ============================================================================

export const fileUploadSchema = z.object({
  file: z.object({
    name: z.string().min(1, 'File name is required'),
    size: z.number()
      .int()
      .positive('File size must be positive')
      .max(50 * 1024 * 1024, 'File size must be less than 50MB'),
    type: z.string().min(1, 'File type is required'),
  }),
  timelineId: cuidSchema,
  stepId: cuidSchema.optional(),
  documentType: documentTypeSchema,
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  isRequired: z.boolean().optional().default(false),
}).strict();

// ============================================================================
// EXPORT TYPES FOR USE IN API ROUTES
// ============================================================================

export type CreateTimelineInput = z.infer<typeof createTimelineSchema>;
export type UpdateTimelineInput = z.infer<typeof updateTimelineSchema>;
export type CreateTimelineStepInput = z.infer<typeof createTimelineStepSchema>;
export type UpdateTimelineStepInput = z.infer<typeof updateTimelineStepSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type AddStepCommentInput = z.infer<typeof addStepCommentSchema>;
export type TimelineQueryInput = z.infer<typeof timelineQuerySchema>;
export type StepsQueryInput = z.infer<typeof stepsQuerySchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;