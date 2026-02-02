-- Migration: Update Customers Table and Add SOS Alerts
-- Description: Add status field to customers and create SOS alerts table
-- Version: 20240202000000

-- ============================================
-- UPDATE CUSTOMERS TABLE
-- ============================================

-- Add status enum type
DO $$ BEGIN
  CREATE TYPE customer_status AS ENUM ('active', 'suspended', 'banned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS status customer_status DEFAULT 'active';

-- Add index for status
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- ============================================
-- SOS ALERTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Location data
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location_accuracy DECIMAL(10,2), -- in meters

  -- Alert details
  message TEXT,
  user_agent TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, acknowledged, resolved, cancelled
  priority TEXT DEFAULT 'high', -- low, medium, high, critical

  -- Response tracking
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sos_alerts_customer ON sos_alerts(customer_id);
CREATE INDEX idx_sos_alerts_booking ON sos_alerts(booking_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX idx_sos_alerts_priority ON sos_alerts(priority);
CREATE INDEX idx_sos_alerts_created ON sos_alerts(created_at DESC);

-- Composite index for pending alerts
CREATE INDEX idx_sos_alerts_pending ON sos_alerts(status, created_at DESC)
  WHERE status IN ('pending', 'acknowledged');

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_sos_alerts_updated_at
  BEFORE UPDATE ON sos_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

-- Customers can create SOS alerts
CREATE POLICY "Customers can create SOS alerts" ON sos_alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = sos_alerts.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Customers can view own SOS alerts
CREATE POLICY "Customers can view own SOS alerts" ON sos_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = sos_alerts.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Admins can view all SOS alerts
CREATE POLICY "Admins can view all SOS alerts" ON sos_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admins can manage all SOS alerts
CREATE POLICY "Admins can manage all SOS alerts" ON sos_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, INSERT ON sos_alerts TO authenticated;
GRANT ALL ON sos_alerts TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE sos_alerts IS 'Emergency SOS alerts from customers';
COMMENT ON COLUMN sos_alerts.status IS 'Alert status: pending, acknowledged, resolved, cancelled';
COMMENT ON COLUMN sos_alerts.priority IS 'Alert priority: low, medium, high, critical';
COMMENT ON COLUMN sos_alerts.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN sos_alerts.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN sos_alerts.location_accuracy IS 'GPS accuracy in meters';

-- ============================================
-- NOTIFICATION FUNCTION
-- ============================================

-- Function to notify admins of new SOS alerts
CREATE OR REPLACE FUNCTION notify_admins_of_sos()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all admin users
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT
    p.id,
    'sos_alert',
    'SOS Alert - Emergency',
    'New emergency alert from customer: ' || COALESCE(c.full_name, 'Unknown'),
    jsonb_build_object(
      'sos_alert_id', NEW.id,
      'customer_id', NEW.customer_id,
      'customer_name', c.full_name,
      'latitude', NEW.latitude,
      'longitude', NEW.longitude,
      'created_at', NEW.created_at
    )
  FROM profiles p
  LEFT JOIN customers c ON c.id = NEW.customer_id
  WHERE p.role = 'ADMIN';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify admins when new SOS alert is created
DROP TRIGGER IF EXISTS notify_admins_on_sos_alert ON sos_alerts;
CREATE TRIGGER notify_admins_on_sos_alert
  AFTER INSERT ON sos_alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_sos();
