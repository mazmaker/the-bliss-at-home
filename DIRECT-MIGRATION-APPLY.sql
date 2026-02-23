-- 🚀 DIRECT MIGRATION: Add Provider Preference to Bookings
-- Copy และ Paste script นี้ใน Supabase Dashboard > SQL Editor
-- แล้วกด "RUN" เพื่อ apply migration

-- ==========================================
-- ADD PROVIDER PREFERENCE COLUMN TO BOOKINGS
-- ==========================================

-- 1. Add provider_preference column (safe operation)
DO $$
BEGIN
  -- Check if column exists first
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'provider_preference'
  ) THEN

    -- Add the column
    ALTER TABLE bookings
    ADD COLUMN provider_preference VARCHAR(20)
    CHECK (provider_preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference'))
    DEFAULT 'no-preference';

    -- Add comment
    COMMENT ON COLUMN bookings.provider_preference IS 'Customer provider preference for staff assignment';

    -- Add index for performance
    CREATE INDEX idx_bookings_provider_preference ON bookings(provider_preference)
    WHERE provider_preference IS NOT NULL;

    -- Update existing bookings with default value
    UPDATE bookings SET provider_preference = 'no-preference' WHERE provider_preference IS NULL;

    RAISE NOTICE '✅ SUCCESS: Added provider_preference column to bookings table';

  ELSE
    RAISE NOTICE '⚠️ INFO: provider_preference column already exists';
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

-- 3. Enhanced function for staff assignment (upgrade existing function)
CREATE OR REPLACE FUNCTION get_available_staff_for_booking(
  booking_date DATE,
  booking_time TIME,
  duration_minutes INTEGER,
  provider_preference VARCHAR(20) DEFAULT 'no-preference',
  hotel_id UUID DEFAULT NULL,
  exclude_booking_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  name_th VARCHAR,
  name_en VARCHAR,
  gender VARCHAR,
  specializations TEXT[],
  is_available BOOLEAN,
  preference_match_priority INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name_th,
    s.name_en,
    s.gender,
    s.specializations,
    s.is_available,
    -- Priority scoring for matching
    CASE
      WHEN provider_preference = 'female-only' AND s.gender = 'female' THEN 1
      WHEN provider_preference = 'male-only' AND s.gender = 'male' THEN 1
      WHEN provider_preference = 'prefer-female' AND s.gender = 'female' THEN 2
      WHEN provider_preference = 'prefer-male' AND s.gender = 'male' THEN 2
      WHEN provider_preference = 'no-preference' THEN 3
      WHEN provider_preference IN ('prefer-female', 'prefer-male') THEN 4
      ELSE 5
    END as preference_match_priority
  FROM staff s
  WHERE
    s.is_active = true
    AND s.is_available = true
    AND (hotel_id IS NULL OR s.hotel_id = get_available_staff_for_booking.hotel_id)
    AND (
      provider_preference = 'no-preference'
      OR (provider_preference = 'female-only' AND s.gender = 'female')
      OR (provider_preference = 'male-only' AND s.gender = 'male')
      OR (provider_preference IN ('prefer-female', 'prefer-male'))
    )
    -- Time availability check
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.staff_id = s.id
        AND b.booking_date = get_available_staff_for_booking.booking_date
        AND b.status IN ('confirmed', 'in_progress', 'pending')
        AND (exclude_booking_id IS NULL OR b.id != exclude_booking_id)
        AND (
          (b.booking_time <= get_available_staff_for_booking.booking_time
           AND (b.booking_time::time + (COALESCE(b.duration, 60) || ' minutes')::interval) > get_available_staff_for_booking.booking_time)
          OR
          (get_available_staff_for_booking.booking_time <= b.booking_time
           AND (get_available_staff_for_booking.booking_time::time + (duration_minutes || ' minutes')::interval) > b.booking_time)
        )
    )
  ORDER BY
    preference_match_priority ASC,
    s.name_th ASC;
END;
$$;

-- Grant permissions on new function
GRANT EXECUTE ON FUNCTION get_available_staff_for_booking TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_staff_for_booking TO anon;

-- 4. Create reporting view
CREATE OR REPLACE VIEW booking_provider_preference_stats AS
SELECT
  provider_preference,
  COUNT(*) as booking_count,
  COUNT(CASE WHEN staff_id IS NOT NULL THEN 1 END) as assigned_count,
  ROUND(
    COUNT(CASE WHEN staff_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*),
    2
  ) as assignment_success_rate
FROM bookings
WHERE provider_preference IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_preference
ORDER BY booking_count DESC;

-- Grant permissions on view
GRANT SELECT ON booking_provider_preference_stats TO authenticated;

-- 5. Final validation and success message
DO $$
BEGIN
  -- Test that we can select from the new column
  PERFORM provider_preference FROM bookings LIMIT 1;
  RAISE NOTICE '✅ VALIDATION: Can select provider_preference column';

  -- Test validation function
  IF validate_provider_preference('female-only') THEN
    RAISE NOTICE '✅ VALIDATION: validate_provider_preference function works';
  END IF;

  RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '   - provider_preference column added to bookings table';
  RAISE NOTICE '   - Validation functions created';
  RAISE NOTICE '   - Staff assignment functions updated';
  RAISE NOTICE '   - Reporting views available';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '   1. Hotel App can now store provider preferences';
  RAISE NOTICE '   2. Customer App can include preferences in bookings';
  RAISE NOTICE '   3. Staff assignment will use gender preferences';

EXCEPTION WHEN undefined_column THEN
  RAISE EXCEPTION '❌ ERROR: provider_preference column was not created properly';
END
$$;

-- 6. Show final column information for verification
SELECT
  '✅ Column Information' as status,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name = 'provider_preference';