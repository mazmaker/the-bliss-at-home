-- Migration: Add Staff Support to SOS Alerts
-- Description: Enable staff members to create SOS alerts
-- Version: 20260201000000

-- ============================================
-- UPDATE SOS_ALERTS TABLE
-- ============================================

-- Add staff_id column to sos_alerts table
ALTER TABLE sos_alerts
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Add index for staff_id
CREATE INDEX IF NOT EXISTS idx_sos_alerts_staff ON sos_alerts(staff_id);

-- Add constraint to ensure either customer_id or staff_id is set (but not both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sos_alerts_source_check'
  ) THEN
    ALTER TABLE sos_alerts
    ADD CONSTRAINT sos_alerts_source_check
    CHECK (
      (customer_id IS NOT NULL AND staff_id IS NULL) OR
      (customer_id IS NULL AND staff_id IS NOT NULL)
    );
  END IF;
END $$;

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Staff can create their own SOS alerts
DROP POLICY IF EXISTS "Staff can create SOS alerts" ON sos_alerts;
CREATE POLICY "Staff can create SOS alerts" ON sos_alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = sos_alerts.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

-- Staff can view their own SOS alerts
DROP POLICY IF EXISTS "Staff can view own SOS alerts" ON sos_alerts;
CREATE POLICY "Staff can view own SOS alerts" ON sos_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = sos_alerts.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

-- ============================================
-- UPDATE NOTIFICATION FUNCTION
-- ============================================

-- Update function to handle both customer and staff SOS alerts
CREATE OR REPLACE FUNCTION notify_admins_of_sos()
RETURNS TRIGGER AS $$
DECLARE
  alert_source TEXT;
  source_name TEXT;
BEGIN
  -- Determine the source of the SOS alert
  IF NEW.customer_id IS NOT NULL THEN
    SELECT full_name INTO source_name FROM customers WHERE id = NEW.customer_id;
    alert_source := 'customer';
  ELSIF NEW.staff_id IS NOT NULL THEN
    SELECT name_th INTO source_name FROM staff WHERE id = NEW.staff_id;
    alert_source := 'staff';
  ELSE
    source_name := 'Unknown';
    alert_source := 'unknown';
  END IF;

  -- Insert notification for all admin users
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT
    p.id,
    'sos_alert',
    'SOS Alert - Emergency',
    'New emergency alert from ' || alert_source || ': ' || COALESCE(source_name, 'Unknown'),
    jsonb_build_object(
      'sos_alert_id', NEW.id,
      'source_type', alert_source,
      'customer_id', NEW.customer_id,
      'staff_id', NEW.staff_id,
      'source_name', source_name,
      'latitude', NEW.latitude,
      'longitude', NEW.longitude,
      'created_at', NEW.created_at
    )
  FROM profiles p
  WHERE p.role = 'ADMIN';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN sos_alerts.staff_id IS 'Reference to staff member if SOS is from staff';
COMMENT ON CONSTRAINT sos_alerts_source_check ON sos_alerts IS 'Ensures SOS alert comes from either a customer or staff, but not both';
