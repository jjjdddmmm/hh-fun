-- CreateEnum
CREATE TYPE "timeline_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'DELAYED');

-- CreateEnum
CREATE TYPE "step_category" AS ENUM ('LEGAL', 'FINANCING', 'INSPECTION', 'PAPERWORK', 'COMMUNICATION', 'CLOSING');

-- CreateEnum
CREATE TYPE "step_status" AS ENUM ('UPCOMING', 'CURRENT', 'COMPLETED', 'SKIPPED', 'BLOCKED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "step_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('CONTRACT', 'FINANCIAL', 'INSPECTION', 'APPRAISAL', 'INSURANCE', 'TITLE', 'MORTGAGE', 'CLOSING', 'CORRESPONDENCE', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "team_member_role" AS ENUM ('BUYER_AGENT', 'SELLER_AGENT', 'LENDER', 'LOAN_OFFICER', 'INSPECTOR', 'APPRAISER', 'ATTORNEY', 'TITLE_COMPANY', 'INSURANCE_AGENT', 'CONTRACTOR', 'ESCROW_OFFICER', 'OTHER');

-- CreateEnum
CREATE TYPE "contact_method" AS ENUM ('EMAIL', 'PHONE', 'TEXT', 'BOTH');

-- CreateEnum
CREATE TYPE "note_type" AS ENUM ('GENERAL', 'MILESTONE', 'ISSUE', 'DECISION', 'REMINDER');

-- CreateEnum
CREATE TYPE "comment_type" AS ENUM ('UPDATE', 'QUESTION', 'ISSUE', 'RESOLUTION', 'REMINDER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "askingPrice" BIGINT,
    "squareFootage" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(65,30),
    "yearBuilt" INTEGER,
    "propertyType" TEXT,
    "lotSize" DECIMAL(65,30),
    "propertyTaxes" BIGINT,
    "hoaFees" BIGINT,
    "zestimate" BIGINT,
    "zestimateRangeLow" BIGINT,
    "zestimateRangeHigh" BIGINT,
    "rentZestimate" BIGINT,
    "rentZestimateRangeLow" BIGINT,
    "rentZestimateRangeHigh" BIGINT,
    "zestimateLastUpdated" TIMESTAMP(3),
    "mlsNumber" TEXT,
    "mlsUrl" TEXT,
    "images" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "absenteeOwner" BOOLEAN,
    "batchDataCost" DECIMAL(65,30),
    "batchDataLastUpdated" TIMESTAMP(3),
    "buildingFeatures" JSONB,
    "capRate" DECIMAL(65,30),
    "cashBuyer" BOOLEAN,
    "daysOnMarket" INTEGER,
    "demandLevel" TEXT,
    "distressedProperty" BOOLEAN,
    "equityAmount" BIGINT,
    "equityPercent" DECIMAL(65,30),
    "estimatedRent" BIGINT,
    "estimatedValue" BIGINT,
    "fixAndFlipPotential" BOOLEAN,
    "foreclosureStatus" TEXT,
    "highEquity" BOOLEAN,
    "lastSaleDate" TIMESTAMP(3),
    "lastSalePrice" BIGINT,
    "marketAnalytics" JSONB,
    "marketTrend" TEXT,
    "mortgageBalance" BIGINT,
    "neighborhoodData" JSONB,
    "ownerEmail" TEXT,
    "ownerName" TEXT,
    "ownerOccupied" BOOLEAN,
    "ownerPhone" TEXT,
    "ownershipLength" INTEGER,
    "priceHistory" JSONB,
    "pricePerSqft" INTEGER,
    "quickLists" JSONB,
    "rentToValueRatio" DECIMAL(65,30),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_analyses" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "confidence" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparable_sales" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "squareFootage" INTEGER,
    "radius" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "propertyType" TEXT,
    "comparablesData" JSONB NOT NULL,
    "comparableCount" INTEGER NOT NULL DEFAULT 0,
    "avgSalePrice" DECIMAL(12,2),
    "avgPricePerSqft" DECIMAL(8,2),
    "avgDaysOnMarket" INTEGER,
    "inventoryLevel" TEXT,
    "apiCost" DECIMAL(5,2) NOT NULL DEFAULT 0.46,
    "dataSource" TEXT NOT NULL DEFAULT 'BatchData',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "comparable_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timelines" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Home Purchase Timeline',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedClosingDate" TIMESTAMP(3),
    "actualClosingDate" TIMESTAMP(3),
    "status" "timeline_status" NOT NULL DEFAULT 'ACTIVE',
    "progressPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 10,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_steps" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "step_category" NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "daysFromStart" INTEGER NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "status" "step_status" NOT NULL DEFAULT 'UPCOMING',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "notes" TEXT,
    "completedBy" TEXT,
    "estimatedCost" BIGINT,
    "actualCost" BIGINT,
    "priority" "step_priority" NOT NULL DEFAULT 'MEDIUM',
    "externalUrl" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_documents" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "stepId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "documentType" "document_type" NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "thumbnailUrl" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sharedWith" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completionSessionId" TEXT,
    "documentVersion" INTEGER NOT NULL DEFAULT 1,
    "isCurrentVersion" BOOLEAN NOT NULL DEFAULT true,
    "supersededAt" TIMESTAMP(3),
    "supersededBy" TEXT,

    CONSTRAINT "timeline_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_team_members" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "team_member_role" NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "licenseNumber" TEXT,
    "specialties" TEXT[],
    "rating" DECIMAL(3,2),
    "preferredContact" "contact_method" NOT NULL DEFAULT 'EMAIL',
    "availability" TEXT,
    "timezone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recommendedBy" TEXT,
    "notes" TEXT,
    "lastContact" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_notes" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "noteType" "note_type" NOT NULL DEFAULT 'GENERAL',
    "tags" TEXT[],
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_step_comments" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "commentType" "comment_type" NOT NULL DEFAULT 'UPDATE',
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_step_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "properties_userId_idx" ON "properties"("userId");

-- CreateIndex
CREATE INDEX "properties_zipCode_idx" ON "properties"("zipCode");

-- CreateIndex
CREATE INDEX "properties_highEquity_idx" ON "properties"("highEquity");

-- CreateIndex
CREATE INDEX "properties_distressedProperty_idx" ON "properties"("distressedProperty");

-- CreateIndex
CREATE INDEX "properties_absenteeOwner_idx" ON "properties"("absenteeOwner");

-- CreateIndex
CREATE INDEX "properties_lastSaleDate_idx" ON "properties"("lastSaleDate");

-- CreateIndex
CREATE INDEX "properties_daysOnMarket_idx" ON "properties"("daysOnMarket");

-- CreateIndex
CREATE INDEX "properties_ownershipLength_idx" ON "properties"("ownershipLength");

-- CreateIndex
CREATE INDEX "properties_foreclosureStatus_idx" ON "properties"("foreclosureStatus");

-- CreateIndex
CREATE INDEX "properties_equityPercent_idx" ON "properties"("equityPercent");

-- CreateIndex
CREATE INDEX "properties_cashBuyer_idx" ON "properties"("cashBuyer");

-- CreateIndex
CREATE INDEX "properties_marketTrend_zipCode_idx" ON "properties"("marketTrend", "zipCode");

-- CreateIndex
CREATE INDEX "comparable_sales_zipCode_bedrooms_bathrooms_idx" ON "comparable_sales"("zipCode", "bedrooms", "bathrooms");

-- CreateIndex
CREATE INDEX "comparable_sales_propertyId_idx" ON "comparable_sales"("propertyId");

-- CreateIndex
CREATE INDEX "comparable_sales_expiresAt_idx" ON "comparable_sales"("expiresAt");

-- CreateIndex
CREATE INDEX "comparable_sales_zipCode_radius_idx" ON "comparable_sales"("zipCode", "radius");

-- CreateIndex
CREATE UNIQUE INDEX "timelines_propertyId_key" ON "timelines"("propertyId");

-- CreateIndex
CREATE INDEX "timelines_userId_idx" ON "timelines"("userId");

-- CreateIndex
CREATE INDEX "timelines_status_idx" ON "timelines"("status");

-- CreateIndex
CREATE INDEX "timelines_startDate_idx" ON "timelines"("startDate");

-- CreateIndex
CREATE INDEX "timeline_steps_timelineId_idx" ON "timeline_steps"("timelineId");

-- CreateIndex
CREATE INDEX "timeline_steps_status_idx" ON "timeline_steps"("status");

-- CreateIndex
CREATE INDEX "timeline_steps_category_idx" ON "timeline_steps"("category");

-- CreateIndex
CREATE INDEX "timeline_steps_scheduledDate_idx" ON "timeline_steps"("scheduledDate");

-- CreateIndex
CREATE INDEX "timeline_steps_sortOrder_idx" ON "timeline_steps"("sortOrder");

-- CreateIndex
CREATE INDEX "timeline_documents_timelineId_idx" ON "timeline_documents"("timelineId");

-- CreateIndex
CREATE INDEX "timeline_documents_stepId_idx" ON "timeline_documents"("stepId");

-- CreateIndex
CREATE INDEX "timeline_documents_documentType_idx" ON "timeline_documents"("documentType");

-- CreateIndex
CREATE INDEX "timeline_documents_uploadedBy_idx" ON "timeline_documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "timeline_documents_completionSessionId_idx" ON "timeline_documents"("completionSessionId");

-- CreateIndex
CREATE INDEX "timeline_documents_isCurrentVersion_idx" ON "timeline_documents"("isCurrentVersion");

-- CreateIndex
CREATE INDEX "timeline_documents_stepId_documentType_isCurrentVersion_idx" ON "timeline_documents"("stepId", "documentType", "isCurrentVersion");

-- CreateIndex
CREATE INDEX "timeline_team_members_timelineId_idx" ON "timeline_team_members"("timelineId");

-- CreateIndex
CREATE INDEX "timeline_team_members_role_idx" ON "timeline_team_members"("role");

-- CreateIndex
CREATE INDEX "timeline_team_members_isActive_idx" ON "timeline_team_members"("isActive");

-- CreateIndex
CREATE INDEX "timeline_notes_timelineId_idx" ON "timeline_notes"("timelineId");

-- CreateIndex
CREATE INDEX "timeline_notes_noteType_idx" ON "timeline_notes"("noteType");

-- CreateIndex
CREATE INDEX "timeline_notes_createdAt_idx" ON "timeline_notes"("createdAt");

-- CreateIndex
CREATE INDEX "timeline_step_comments_stepId_idx" ON "timeline_step_comments"("stepId");

-- CreateIndex
CREATE INDEX "timeline_step_comments_createdAt_idx" ON "timeline_step_comments"("createdAt");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_analyses" ADD CONSTRAINT "property_analyses_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparable_sales" ADD CONSTRAINT "comparable_sales_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_steps" ADD CONSTRAINT "timeline_steps_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_documents" ADD CONSTRAINT "timeline_documents_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "timeline_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_documents" ADD CONSTRAINT "timeline_documents_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "timeline_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_documents" ADD CONSTRAINT "timeline_documents_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_team_members" ADD CONSTRAINT "timeline_team_members_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_notes" ADD CONSTRAINT "timeline_notes_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_step_comments" ADD CONSTRAINT "timeline_step_comments_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "timeline_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

