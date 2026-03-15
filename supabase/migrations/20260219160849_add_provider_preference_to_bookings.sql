-- Add Provider Preference Column to Bookings Table
-- Date: 2026-02-19
-- Purpose: Enable storing customer provider preference for staff assignment

-- 1. Add provider_preference column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS provider_preference VARCHAR(20)
CHECK (provider_preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference'))
DEFAULT 'no-preference';

-- 2. Add index for fast preference queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_preference ON bookings(provider_preference)
WHERE provider_preference IS NOT NULL;

-- 3. Add composite index for staff assignment queries
CREATE INDEX IF NOT EXISTS idx_bookings_staff_assignment ON bookings(booking_date, booking_time, provider_preference, status)
WHERE status IN ('confirmed', 'in_progress', 'pending');

-- 4. Add comment to document the column
COMMENT ON COLUMN bookings.provider_preference IS 'Customer provider preference for staff assignment: female-only, male-only, prefer-female, prefer-male, no-preference';

-- 5. Update existing bookings with default value (for existing data)
UPDATE bookings
SET provider_preference = 'no-preference'
WHERE provider_preference IS NULL;

-- 6. Create function to validate provider preference values
CREATE OR REPLACE FUNCTION validate_provider_preference(preference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference');
END;
$$;

-- 7. Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION validate_provider_preference TO authenticated;
GRANT EXECUTE ON FUNCTION validate_provider_preference TO anon;

-- 8. Update the get_staff_by_preference function to work with booking data
-- This enhances the existing function to be more flexible
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
    -- Priority scoring: 1 = perfect match, 2 = preferred match, 3 = acceptable
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
    -- Check time availability (avoid conflicts)
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.staff_id = s.id
        AND b.booking_date = get_available_staff_for_booking.booking_date
        AND b.status IN ('confirmed', 'in_progress', 'pending')
        AND (exclude_booking_id IS NULL OR b.id != exclude_booking_id)
        AND (
          -- Time overlap check
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

-- 9. Grant permissions on the new function
GRANT EXECUTE ON FUNCTION get_available_staff_for_booking TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_staff_for_booking TO anon;

-- 10. Add helpful views for reporting
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

-- 11. Final comment on table
COMMENT ON TABLE bookings IS 'Bookings table with provider preference support for staff assignment. Updated 2026-02-19';