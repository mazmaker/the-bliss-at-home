-- 🚀 Apply Provider Preference Migration
-- Date: 2026-02-19

-- 1. Add provider_preference column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS provider_preference VARCHAR(20)
CHECK (provider_preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference'))
DEFAULT 'no-preference';

-- 2. Add index for fast preference queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_preference ON bookings(provider_preference)
WHERE provider_preference IS NOT NULL;

-- 3. Add comment to document the column
COMMENT ON COLUMN bookings.provider_preference IS 'Customer provider preference for staff assignment';

-- 4. Update existing bookings with default value
UPDATE bookings
SET provider_preference = 'no-preference'
WHERE provider_preference IS NULL;

-- 5. Create validation function
CREATE OR REPLACE FUNCTION validate_provider_preference(preference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference');
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION validate_provider_preference TO authenticated;
GRANT EXECUTE ON FUNCTION validate_provider_preference TO anon;

-- 7. Success message
SELECT
  '✅ Provider Preference Migration Applied Successfully!' as status,
  'Now restart Hotel App to see the UI' as next_step;