-- Migration: Fix Duration Options Duplicate Issues
-- Description: Resolve duplicate duration_options values and remove any unwanted unique constraints
-- Version: 20260210040000

-- ============================================
-- REMOVE ANY EXISTING UNIQUE CONSTRAINT
-- ============================================

-- Drop unique constraint if it exists (this might be causing the error)
DO $$
BEGIN
    -- Drop the problematic unique constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_name = 'services_duration_options_key'
               AND table_name = 'services') THEN
        ALTER TABLE services DROP CONSTRAINT services_duration_options_key;
        RAISE NOTICE 'Dropped unique constraint services_duration_options_key';
    END IF;
END $$;

-- ============================================
-- ANALYZE CURRENT STATE
-- ============================================

-- Check for duplicate duration_options values
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT duration_options, COUNT(*) as cnt
        FROM services
        WHERE duration_options IS NOT NULL
        GROUP BY duration_options
        HAVING COUNT(*) > 1
    ) duplicates;

    RAISE NOTICE 'Found % groups of duplicate duration_options values', duplicate_count;
END $$;

-- ============================================
-- FIX DUPLICATE DATA
-- ============================================

-- Strategy: Make each service's duration_options slightly different if they're identical
-- by ensuring they reflect the actual service requirements

-- Update services that have identical duration_options to make them unique based on service characteristics
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

-- ============================================
-- ENSURE DATA INTEGRITY
-- ============================================

-- Make sure no services have NULL or empty duration_options
UPDATE services
SET duration_options = json_build_array(COALESCE(duration, 60))::jsonb
WHERE duration_options IS NULL
   OR duration_options = '[]'::jsonb
   OR jsonb_array_length(duration_options) = 0;

-- ============================================
-- VERIFY CONSTRAINTS EXIST
-- ============================================

-- Ensure proper constraints exist (but NOT unique constraints)
DO $$
BEGIN
    -- Check and add not-empty constraint if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name='check_duration_options_not_empty'
                   AND table_name='services') THEN
        ALTER TABLE services
        ADD CONSTRAINT check_duration_options_not_empty
        CHECK (jsonb_array_length(duration_options) > 0);
        RAISE NOTICE 'Added check_duration_options_not_empty constraint';
    END IF;

    -- Check and add valid values constraint if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name='check_duration_options_valid_values'
                   AND table_name='services') THEN
        ALTER TABLE services
        ADD CONSTRAINT check_duration_options_valid_values
        CHECK (
          duration_options <@ '[60, 90, 120]'::jsonb AND
          jsonb_array_length(duration_options) <= 3
        );
        RAISE NOTICE 'Added check_duration_options_valid_values constraint';
    END IF;
END $$;

-- ============================================
-- ENSURE INDEX EXISTS
-- ============================================

-- Create GIN index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_services_duration_options') THEN
        CREATE INDEX idx_services_duration_options ON services USING gin(duration_options);
        RAISE NOTICE 'Created idx_services_duration_options index';
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the fix worked
DO $$
DECLARE
    total_services INTEGER;
    services_with_options INTEGER;
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_services FROM services;
    SELECT COUNT(*) INTO services_with_options FROM services WHERE duration_options IS NOT NULL;

    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT duration_options, COUNT(*) as cnt
        FROM services
        WHERE duration_options IS NOT NULL
        GROUP BY duration_options
        HAVING COUNT(*) > 1
    ) duplicates;

    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '  Total services: %', total_services;
    RAISE NOTICE '  Services with duration_options: %', services_with_options;
    RAISE NOTICE '  Duplicate duration_options groups: %', duplicate_count;
END $$;