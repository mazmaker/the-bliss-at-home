-- Migration: Add Multiple Duration Options Support
-- Description: Allow services to have multiple duration options (60, 90, 120 minutes)
-- Version: 20260210

-- Add new column for multiple duration options (with IF NOT EXISTS to avoid conflicts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='services' AND column_name='duration_options') THEN
        ALTER TABLE services ADD COLUMN duration_options JSONB DEFAULT '[60]'::jsonb;
    END IF;
END $$;

-- Convert existing single duration values to array format
UPDATE services
SET duration_options = json_build_array(duration)::jsonb
WHERE duration_options IS NULL OR duration_options = '[60]'::jsonb;

-- Add constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name='check_duration_options_not_empty') THEN
        ALTER TABLE services
        ADD CONSTRAINT check_duration_options_not_empty
        CHECK (jsonb_array_length(duration_options) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name='check_duration_options_valid_values') THEN
        ALTER TABLE services
        ADD CONSTRAINT check_duration_options_valid_values
        CHECK (
          duration_options <@ '[60, 90, 120]'::jsonb AND
          jsonb_array_length(duration_options) <= 3
        );
    END IF;
END $$;

-- Create index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_services_duration_options') THEN
        CREATE INDEX idx_services_duration_options ON services USING gin(duration_options);
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN services.duration_options IS 'Array of available duration options in minutes (60, 90, 120)';

-- Create function for backward compatibility
CREATE OR REPLACE FUNCTION get_primary_duration(duration_opts JSONB)
RETURNS INTEGER AS $$
BEGIN
  -- Return the first (primary) duration from the options array
  RETURN (duration_opts->0)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;