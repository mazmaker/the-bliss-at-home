-- Migration: Add Admin Quick Booking Support
-- Description: Extend existing tables to support admin-created bookings
-- Version: 220
-- Dependencies: 006_create_bookings_table.sql, 005_create_customers_table.sql

-- ============================================
-- EXTEND BOOKINGS TABLE FOR ADMIN SUPPORT
-- ============================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  created_by_admin_id UUID REFERENCES profiles(id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  booking_source TEXT DEFAULT 'customer_app';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  payment_method_recorded TEXT;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  admin_override_restrictions BOOLEAN DEFAULT FALSE;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  discount_code_applied TEXT;

-- Add constraint for booking_source values
ALTER TABLE bookings ADD CONSTRAINT check_booking_source
  CHECK (booking_source IN ('customer_app', 'admin_app', 'hotel_portal', 'staff_app'));

-- Add constraint for payment_method_recorded values
ALTER TABLE bookings ADD CONSTRAINT check_payment_method_recorded
  CHECK (payment_method_recorded IN ('cash', 'bank_transfer', 'credit_card', 'promptpay', 'voucher', 'other') OR payment_method_recorded IS NULL);

-- ============================================
-- EXTEND CUSTOMERS TABLE FOR ADMIN SUPPORT
-- ============================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS
  created_by_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS
  admin_notes TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS
  preferred_contact_method TEXT DEFAULT 'phone';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS
  emergency_contact_name TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS
  emergency_contact_phone TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS
  last_admin_booking TIMESTAMPTZ;

-- Add constraint for preferred_contact_method
ALTER TABLE customers ADD CONSTRAINT check_preferred_contact_method
  CHECK (preferred_contact_method IN ('phone', 'line', 'email', 'sms'));

-- ============================================
-- CREATE ADMIN BOOKING LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS admin_booking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for action values
ALTER TABLE admin_booking_logs ADD CONSTRAINT check_admin_action
  CHECK (action IN ('created', 'modified', 'cancelled', 'staff_assigned', 'payment_recorded'));

-- ============================================
-- INDEXES FOR ADMIN BOOKING SUPPORT
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bookings_created_by_admin ON bookings(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_bookings_admin_override ON bookings(admin_override_restrictions);

CREATE INDEX IF NOT EXISTS idx_customers_created_by_admin ON customers(created_by_admin);
CREATE INDEX IF NOT EXISTS idx_customers_phone_search ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers(full_name);

CREATE INDEX IF NOT EXISTS idx_admin_booking_logs_booking ON admin_booking_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_admin_booking_logs_admin ON admin_booking_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_booking_logs_action ON admin_booking_logs(action);

-- ============================================
-- RLS POLICIES FOR ADMIN BOOKING SUPPORT
-- ============================================

-- Admin can see all bookings they create
CREATE POLICY IF NOT EXISTS "Admin can manage their bookings" ON bookings
  FOR ALL TO authenticated
  USING (
    created_by_admin_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Staff can see admin-created bookings assigned to them
CREATE POLICY IF NOT EXISTS "Staff can see assigned admin bookings" ON bookings
  FOR SELECT TO authenticated
  USING (
    staff_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Admin can search and manage customers they create
CREATE POLICY IF NOT EXISTS "Admin can manage customers" ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can view their booking logs
CREATE POLICY IF NOT EXISTS "Admin can view booking logs" ON admin_booking_logs
  FOR ALL TO authenticated
  USING (
    admin_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- FUNCTIONS FOR ADMIN BOOKING SUPPORT
-- ============================================

-- Function to log admin booking actions
CREATE OR REPLACE FUNCTION log_admin_booking_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if this is an admin-created booking
  IF NEW.created_by_admin_id IS NOT NULL THEN
    INSERT INTO admin_booking_logs (booking_id, admin_id, action, details)
    VALUES (
      NEW.id,
      NEW.created_by_admin_id,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'created'
        WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'modified'
        ELSE 'modified'
      END,
      jsonb_build_object(
        'old_status', COALESCE(OLD.status::text, 'none'),
        'new_status', NEW.status::text,
        'booking_source', NEW.booking_source,
        'payment_method', NEW.payment_method_recorded,
        'override_restrictions', NEW.admin_override_restrictions
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin booking logging
DROP TRIGGER IF EXISTS admin_booking_log_trigger ON bookings;
CREATE TRIGGER admin_booking_log_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_booking_action();

-- Function to update customer stats when admin creates bookings
CREATE OR REPLACE FUNCTION update_customer_admin_booking_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer stats for admin bookings
  IF NEW.created_by_admin_id IS NOT NULL THEN
    UPDATE customers
    SET
      last_admin_booking = NEW.created_at,
      total_bookings = total_bookings + 1
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer admin booking stats
DROP TRIGGER IF EXISTS customer_admin_booking_stats_trigger ON bookings;
CREATE TRIGGER customer_admin_booking_stats_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_admin_booking_stats();