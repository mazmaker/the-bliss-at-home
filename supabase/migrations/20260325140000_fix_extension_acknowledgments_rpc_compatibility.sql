-- ========================================
-- Fix Supabase Schema Cache Issue
-- ========================================

-- Option 1: Create alias function with old parameter name for backward compatibility
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
  -- Call the main function with proper parameter name
  RETURN QUERY
  SELECT * FROM get_pending_extension_acknowledgments_v2(staff_profile_id);
END;
$$ LANGUAGE plpgsql;

-- Rename the existing function to avoid conflicts
ALTER FUNCTION get_pending_extension_acknowledgments(p_staff_profile_id UUID)
RENAME TO get_pending_extension_acknowledgments_v2;

-- Test the function
SELECT
  'Testing Fixed Function:' as test_status,
  COUNT(*) as total_pending
FROM get_pending_extension_acknowledgments('9f0c62fe-c821-44e1-86ae-892282396028');

-- Show actual results
SELECT * FROM get_pending_extension_acknowledgments('9f0c62fe-c821-44e1-86ae-892282396028');