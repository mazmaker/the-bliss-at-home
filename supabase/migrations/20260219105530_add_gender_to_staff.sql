-- Add Gender Information to Staff Table for Provider Preference Matching
-- Date: 2026-02-19
-- Purpose: Enable staff assignment based on guest provider preferences

-- 1. Add gender column to staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'));

-- 2. Add specializations for better matching (array field)
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';

-- 3. Add provider matching preferences for staff
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS preferred_client_types TEXT[] DEFAULT '{}'; -- e.g., ['couples', 'singles', 'families']

-- 4. Add updated timestamp
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS gender_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Create index for fast gender queries
CREATE INDEX IF NOT EXISTS idx_staff_gender ON staff(gender) WHERE gender IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_active_gender ON staff(gender, is_active) WHERE is_active = true;

-- 6. Update existing staff with sample data (for development/testing)
-- Note: In production, this data should be manually set by admin
UPDATE staff
SET
  gender = CASE
    WHEN id::text LIKE '%1' OR id::text LIKE '%3' OR id::text LIKE '%5' THEN 'female'
    WHEN id::text LIKE '%2' OR id::text LIKE '%4' OR id::text LIKE '%6' THEN 'male'
    ELSE 'female'
  END,
  specializations = CASE
    WHEN name_th ILIKE '%นวด%' THEN ARRAY['massage', 'thai-massage']
    WHEN name_th ILIKE '%สปา%' THEN ARRAY['spa', 'facial']
    WHEN name_th ILIKE '%เล็บ%' THEN ARRAY['nail', 'manicure', 'pedicure']
    ELSE ARRAY['massage']
  END,
  gender_updated_at = NOW()
WHERE gender IS NULL;

-- 7. Add comment to document the changes
COMMENT ON COLUMN staff.gender IS 'Staff gender for provider preference matching (male, female, other)';
COMMENT ON COLUMN staff.specializations IS 'Array of staff specializations for better service matching';
COMMENT ON COLUMN staff.preferred_client_types IS 'Staff preference for client types they prefer to serve';
COMMENT ON COLUMN staff.gender_updated_at IS 'Timestamp when gender information was last updated';

-- 8. Create function to get available staff by preference
CREATE OR REPLACE FUNCTION get_staff_by_preference(
  booking_date DATE,
  booking_time TIME,
  duration_minutes INTEGER,
  provider_preference VARCHAR(20) DEFAULT 'no-preference',
  hotel_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  name_th VARCHAR,
  gender VARCHAR,
  specializations TEXT[],
  is_available BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name_th,
    s.gender,
    s.specializations,
    s.is_available
  FROM staff s
  WHERE
    s.is_active = true
    AND s.is_available = true
    AND (hotel_id IS NULL OR s.hotel_id = get_staff_by_preference.hotel_id)
    AND (
      provider_preference = 'no-preference'
      OR (provider_preference = 'female-only' AND s.gender = 'female')
      OR (provider_preference = 'male-only' AND s.gender = 'male')
      OR (provider_preference = 'prefer-female' AND s.gender = 'female')
      OR (provider_preference = 'prefer-male' AND s.gender = 'male')
      OR (provider_preference IN ('prefer-female', 'prefer-male'))
    )
    -- Check time availability (simplified - can be enhanced)
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.staff_id = s.id
        AND b.booking_date = get_staff_by_preference.booking_date
        AND b.status IN ('confirmed', 'in_progress', 'pending')
        AND (
          -- Simple time overlap check
          (b.booking_time <= get_staff_by_preference.booking_time
           AND (b.booking_time::time + (COALESCE(b.duration, 60) || ' minutes')::interval) > get_staff_by_preference.booking_time)
          OR
          (get_staff_by_preference.booking_time <= b.booking_time
           AND (get_staff_by_preference.booking_time::time + (duration_minutes || ' minutes')::interval) > b.booking_time)
        )
    )
  ORDER BY
    -- Prioritize exact gender matches for preferences
    CASE
      WHEN provider_preference = 'female-only' AND s.gender = 'female' THEN 1
      WHEN provider_preference = 'male-only' AND s.gender = 'male' THEN 1
      WHEN provider_preference = 'prefer-female' AND s.gender = 'female' THEN 2
      WHEN provider_preference = 'prefer-male' AND s.gender = 'male' THEN 2
      ELSE 3
    END,
    s.name_th;
END;
$$;

-- 9. Grant permissions on the new function
GRANT EXECUTE ON FUNCTION get_staff_by_preference TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_preference TO anon;

-- 10. Add RLS policy update for gender information (staff can see their own gender)
-- The existing RLS policies should handle this, but add specific note
COMMENT ON TABLE staff IS 'Staff table with gender information for provider preference matching. Updated 2026-02-19';