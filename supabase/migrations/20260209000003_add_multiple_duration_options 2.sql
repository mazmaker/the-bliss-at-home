-- Migration: Add Multiple Duration Options Support
-- Description: Allow services to have multiple duration options (60, 90, 120 minutes)
-- Version: 20260209

-- ============================================
-- ADD DURATION OPTIONS COLUMN
-- ============================================

-- Add new column for multiple duration options
ALTER TABLE services
ADD COLUMN duration_options JSONB DEFAULT '[60]'::jsonb;

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- Convert existing single duration values to array format
UPDATE services
SET duration_options = json_build_array(duration)::jsonb
WHERE duration_options IS NULL OR duration_options = '[60]'::jsonb;

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- Ensure duration_options is not empty and contains valid values
ALTER TABLE services
ADD CONSTRAINT check_duration_options_not_empty
CHECK (jsonb_array_length(duration_options) > 0);

ALTER TABLE services
ADD CONSTRAINT check_duration_options_valid_values
CHECK (
  duration_options <@ '[60, 90, 120]'::jsonb AND
  jsonb_array_length(duration_options) <= 3
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for faster queries on duration options
CREATE INDEX idx_services_duration_options ON services USING gin(duration_options);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN services.duration_options IS 'Array of available duration options in minutes (60, 90, 120)';

-- ============================================
-- BACKWARD COMPATIBILITY FUNCTION
-- ============================================

-- Create a computed column function for backward compatibility
-- This allows existing code that uses 'duration' to still work
CREATE OR REPLACE FUNCTION get_primary_duration(duration_opts JSONB)
RETURNS INTEGER AS $$
BEGIN
  -- Return the first (primary) duration from the options array
  RETURN (duration_opts->0)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add a computed column for backward compatibility (optional view)
-- CREATE VIEW services_with_duration AS
-- SELECT *, get_primary_duration(duration_options) as duration
-- FROM services;