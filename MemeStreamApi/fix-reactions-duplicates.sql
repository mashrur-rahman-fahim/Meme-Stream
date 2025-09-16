-- Fix duplicate reactions before applying unique index
-- This script should be run BEFORE the migration

-- Step 1: Check for duplicate reactions
SELECT "PostId", "UserId", COUNT(*) as duplicate_count
FROM "Reactions"
GROUP BY "PostId", "UserId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Keep only the latest reaction for each PostId-UserId combination
-- and delete the older duplicates
WITH ranked_reactions AS (
  SELECT
    "Id",
    "PostId",
    "UserId",
    ROW_NUMBER() OVER (
      PARTITION BY "PostId", "UserId"
      ORDER BY "CreatedAt" DESC, "Id" DESC
    ) as rn
  FROM "Reactions"
)
DELETE FROM "Reactions"
WHERE "Id" IN (
  SELECT "Id"
  FROM ranked_reactions
  WHERE rn > 1
);

-- Step 3: Verify no more duplicates exist
SELECT "PostId", "UserId", COUNT(*) as count
FROM "Reactions"
GROUP BY "PostId", "UserId"
HAVING COUNT(*) > 1;

-- If the above query returns no rows, then we're ready to create the unique index