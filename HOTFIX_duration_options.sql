-- HOTFIX: Resolve duration_options unique constraint error
-- Run this directly in Supabase SQL Editor or your PostgreSQL client

-- Step 1: Remove any problematic unique constraint
DROP INDEX IF EXISTS services_duration_options_key;
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_duration_options_key;

-- Step 2: Check current state
SELECT
    'Current duplicate groups:' as info,
    COUNT(*) as duplicate_groups
FROM (
    SELECT duration_options, COUNT(*) as cnt
    FROM services
    WHERE duration_options IS NOT NULL
    GROUP BY duration_options
    HAVING COUNT(*) > 1
) duplicates;

-- Step 3: Fix duplicate data by making duration_options unique based on service type
UPDATE services
SET duration_options = CASE
    -- For massage services, typically support all durations
    WHEN category = 'massage' THEN '[60, 90, 120]'::jsonb
    -- For nail services, typically shorter durations
    WHEN category = 'nail' THEN '[60, 90]'::jsonb
    -- For spa services, typically longer durations
    WHEN category = 'spa' THEN '[60, 90, 120]'::jsonb
    -- Default fallback based on existing duration column
    ELSE json_build_array(COALESCE(duration, 60))::jsonb
END
WHERE duration_options = '[60]'::jsonb OR duration_options IS NULL;

-- Step 4: Ensure no NULL or empty values
UPDATE services
SET duration_options = json_build_array(COALESCE(duration, 60))::jsonb
WHERE duration_options IS NULL
   OR duration_options = '[]'::jsonb
   OR jsonb_array_length(duration_options) = 0;

-- Step 5: Verify the fix
SELECT
    'After fix - duplicate groups:' as info,
    COUNT(*) as duplicate_groups
FROM (
    SELECT duration_options, COUNT(*) as cnt
    FROM services
    WHERE duration_options IS NOT NULL
    GROUP BY duration_options
    HAVING COUNT(*) > 1
) duplicates;

-- Step 6: Show sample of fixed data
SELECT
    id,
    name_en,
    category,
    duration,
    duration_options,
    'Sample of fixed services' as note
FROM services
ORDER BY category, name_en
LIMIT 10;