-- ========================================
-- Extension Acknowledgment System (Fixed)
-- Date: 2026-03-25
-- Description: Staff acknowledgment tracking for extensions
-- ========================================

-- Create extension acknowledgments table
CREATE TABLE IF NOT EXISTS extension_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL, -- Reference to auth.uid(), not staff.id
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one acknowledgment per staff per extension
  UNIQUE(booking_service_id, staff_profile_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_staff_pending
ON extension_acknowledgments(staff_profile_id, acknowledged_at)
WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_booking_service
ON extension_acknowledgments(booking_service_id);

-- Add RLS policies
ALTER TABLE extension_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Staff can only see their own acknowledgments
CREATE POLICY "staff_acknowledgments_select" ON extension_acknowledgments
FOR SELECT TO authenticated
USING (staff_profile_id = auth.uid());

-- Staff can update their own acknowledgments
CREATE POLICY "staff_acknowledgments_update" ON extension_acknowledgments
FOR UPDATE TO authenticated
USING (staff_profile_id = auth.uid());

-- System can insert acknowledgments
CREATE POLICY "system_acknowledgments_insert" ON extension_acknowledgments
FOR INSERT TO authenticated
WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE extension_acknowledgments IS 'Tracks staff acknowledgments for booking extensions';
COMMENT ON COLUMN extension_acknowledgments.booking_service_id IS 'Reference to the extension booking service';
COMMENT ON COLUMN extension_acknowledgments.staff_profile_id IS 'Staff profile ID (auth.uid()) who needs to acknowledge';
COMMENT ON COLUMN extension_acknowledgments.job_id IS 'Job associated with the extension';
COMMENT ON COLUMN extension_acknowledgments.acknowledged_at IS 'When staff acknowledged the extension (NULL = pending)';

-- ========================================
-- Update extension trigger to create acknowledgment records
-- ========================================
CREATE OR REPLACE FUNCTION create_extension_acknowledgment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an extension
  IF NEW.is_extension = TRUE THEN
    -- Create acknowledgment record for the assigned staff
    INSERT INTO extension_acknowledgments (
      booking_service_id,
      staff_profile_id,
      job_id
    )
    SELECT
      NEW.id,
      j.staff_id, -- This is actually the profile_id
      j.id
    FROM jobs j
    WHERE j.booking_id = NEW.booking_id
    AND j.staff_id IS NOT NULL;

    RAISE NOTICE 'Created extension acknowledgment for booking_service %, staff_profile %',
                 NEW.id, (SELECT j.staff_id FROM jobs j WHERE j.booking_id = NEW.booking_id AND j.staff_id IS NOT NULL LIMIT 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing trigger to include acknowledgment creation
DROP TRIGGER IF EXISTS trigger_extension_acknowledgment ON booking_services;
CREATE TRIGGER trigger_extension_acknowledgment
  AFTER INSERT ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION create_extension_acknowledgment();

-- ========================================
-- Helper functions
-- ========================================

-- Function to get pending acknowledgments for a staff member
CREATE OR REPLACE FUNCTION get_pending_extension_acknowledgments(staff_profile_id UUID)
RETURNS TABLE (
  acknowledgment_id UUID,
  booking_service_id UUID,
  job_id UUID,
  service_name TEXT,
  customer_name TEXT,
  duration INTEGER,
  price DECIMAL(10,2),
  extended_at TIMESTAMP,
  booking_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.id,
    ea.booking_service_id,
    ea.job_id,
    j.service_name,
    j.customer_name,
    bs.duration,
    bs.price,
    bs.extended_at,
    b.booking_number
  FROM extension_acknowledgments ea
  JOIN jobs j ON ea.job_id = j.id
  JOIN booking_services bs ON ea.booking_service_id = bs.id
  JOIN bookings b ON j.booking_id = b.id
  WHERE ea.staff_profile_id = staff_profile_id
  AND ea.acknowledged_at IS NULL
  AND bs.is_extension = TRUE
  ORDER BY bs.extended_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Test the system with existing data
-- ========================================
DO $$
BEGIN
  -- Create acknowledgment records for existing extensions
  INSERT INTO extension_acknowledgments (
    booking_service_id,
    staff_profile_id,
    job_id
  )
  SELECT DISTINCT
    bs.id,
    j.staff_id, -- This is the profile_id
    j.id
  FROM booking_services bs
  JOIN jobs j ON j.booking_id = bs.booking_id
  WHERE bs.is_extension = TRUE
  AND j.staff_id IS NOT NULL
  ON CONFLICT (booking_service_id, staff_profile_id) DO NOTHING;

  RAISE NOTICE 'Created acknowledgment records for existing extensions';
END $$;

-- Verification query
SELECT
  'Extension Acknowledgments Created:' as status,
  COUNT(*) as total_acknowledgments,
  COUNT(CASE WHEN acknowledged_at IS NULL THEN 1 END) as pending_acknowledgments,
  COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END) as completed_acknowledgments
FROM extension_acknowledgments;