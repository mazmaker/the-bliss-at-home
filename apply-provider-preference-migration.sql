-- Apply Provider Preference Migration Directly
-- Execute this SQL in Supabase Dashboard

-- 1. Add provider_preference column to bookings table (safe operation)
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'provider_preference'
  ) THEN
    -- Add column
    ALTER TABLE bookings
    ADD COLUMN provider_preference VARCHAR(20)
    CHECK (provider_preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference'))
    DEFAULT 'no-preference';

    -- Add comment
    COMMENT ON COLUMN bookings.provider_preference IS 'Customer provider preference for staff assignment';

    -- Add index
    CREATE INDEX idx_bookings_provider_preference ON bookings(provider_preference)
    WHERE provider_preference IS NOT NULL;

    -- Update existing bookings
    UPDATE bookings SET provider_preference = 'no-preference' WHERE provider_preference IS NULL;

    RAISE NOTICE 'SUCCESS: Added provider_preference column to bookings table';
  ELSE
    RAISE NOTICE 'INFO: provider_preference column already exists';
  END IF;
END
$$;

-- 2. Create validation function
CREATE OR REPLACE FUNCTION validate_provider_preference(preference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference');
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_provider_preference TO authenticated;
GRANT EXECUTE ON FUNCTION validate_provider_preference TO anon;

-- 3. Test the migration
DO $$
BEGIN
  -- Test if we can select the new column
  PERFORM provider_preference FROM bookings LIMIT 1;
  RAISE NOTICE 'SUCCESS: Can select provider_preference column';
EXCEPTION WHEN undefined_column THEN
  RAISE EXCEPTION 'ERROR: provider_preference column was not created properly';
END
$$;

-- 4. Display success message
SELECT
  'SUCCESS: Provider preference migration completed!' as status,
  'You can now use provider_preference in Hotel app bookings' as message;

-- 5. Show column info for verification
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name = 'provider_preference';