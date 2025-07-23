-- Fix Document Version Issues
-- This script cleans up the duplicate document versions created by the bug

-- Step 1: Find all completion sessions ordered by creation date
WITH session_order AS (
  SELECT DISTINCT 
    "completionSessionId",
    "stepId",
    MIN("createdAt") as session_start
  FROM "timeline_documents" 
  WHERE "completionSessionId" IS NOT NULL
  GROUP BY "completionSessionId", "stepId"
  ORDER BY "stepId", session_start
),

-- Step 2: Assign proper session numbers
numbered_sessions AS (
  SELECT 
    "completionSessionId",
    "stepId",
    session_start,
    ROW_NUMBER() OVER (PARTITION BY "stepId" ORDER BY session_start) as session_number
  FROM session_order
)

-- Step 3: Reset all documents to proper versioning
UPDATE "timeline_documents" 
SET 
  "documentVersion" = ns.session_number,
  "isCurrentVersion" = CASE 
    WHEN ns.session_number = (
      SELECT MAX(session_number) 
      FROM numbered_sessions ns2 
      WHERE ns2."stepId" = "timeline_documents"."stepId"
    ) THEN true 
    ELSE false 
  END,
  "supersededAt" = CASE 
    WHEN ns.session_number = (
      SELECT MAX(session_number) 
      FROM numbered_sessions ns2 
      WHERE ns2."stepId" = "timeline_documents"."stepId"
    ) THEN NULL 
    ELSE "timeline_documents"."createdAt" + INTERVAL '1 second'
  END,
  "supersededBy" = NULL -- We'll handle this separately if needed
FROM numbered_sessions ns
WHERE "timeline_documents"."completionSessionId" = ns."completionSessionId";

-- Step 4: Remove duplicate documents from same session (keep first one of each type)
WITH duplicate_docs AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "stepId", "completionSessionId", "documentType" 
      ORDER BY "createdAt" ASC
    ) as rn
  FROM "timeline_documents"
  WHERE "completionSessionId" IS NOT NULL
)
DELETE FROM "timeline_documents" 
WHERE id IN (
  SELECT id FROM duplicate_docs WHERE rn > 1
);

-- Step 5: Ensure only the latest session documents are marked as current
UPDATE "timeline_documents" 
SET "isCurrentVersion" = false 
WHERE "completionSessionId" IS NOT NULL 
AND "completionSessionId" NOT IN (
  SELECT "completionSessionId" 
  FROM (
    SELECT DISTINCT 
      "completionSessionId",
      "stepId",
      ROW_NUMBER() OVER (PARTITION BY "stepId" ORDER BY MIN("createdAt") DESC) as rn
    FROM "timeline_documents" 
    WHERE "completionSessionId" IS NOT NULL
    GROUP BY "completionSessionId", "stepId"
  ) latest
  WHERE rn = 1
);

-- Step 6: Mark latest session documents as current
UPDATE "timeline_documents" 
SET "isCurrentVersion" = true 
WHERE "completionSessionId" IN (
  SELECT "completionSessionId" 
  FROM (
    SELECT DISTINCT 
      "completionSessionId",
      "stepId",
      ROW_NUMBER() OVER (PARTITION BY "stepId" ORDER BY MIN("createdAt") DESC) as rn
    FROM "timeline_documents" 
    WHERE "completionSessionId" IS NOT NULL
    GROUP BY "completionSessionId", "stepId"
  ) latest
  WHERE rn = 1
);