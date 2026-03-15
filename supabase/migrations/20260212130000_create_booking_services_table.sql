-- Migration: Create Booking Services Junction Table
-- Description: Support multi-service bookings with junction table approach
-- Version: 20260212130000

-- ============================================
-- BOOKING SERVICES JUNCTION TABLE
-- ============================================

CREATE TABLE booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,

  -- Service configuration for this booking
  duration INTEGER NOT NULL, -- Duration in minutes for this specific service
  price DECIMAL(10,2) NOT NULL, -- Price for this service in this booking

  -- Multi-recipient support
  recipient_index INTEGER NOT NULL DEFAULT 0, -- 0 = person 1, 1 = person 2, etc.
  recipient_name TEXT, -- Optional name for this recipient

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0, -- Order of services in the booking

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Primary lookup indexes
CREATE INDEX idx_booking_services_booking ON booking_services(booking_id);
CREATE INDEX idx_booking_services_service ON booking_services(service_id);

-- Composite indexes for efficient queries
CREATE INDEX idx_booking_services_booking_order ON booking_services(booking_id, sort_order);
CREATE INDEX idx_booking_services_booking_recipient ON booking_services(booking_id, recipient_index);

-- Analytics indexes
CREATE INDEX idx_booking_services_price ON booking_services(price);
CREATE INDEX idx_booking_services_duration ON booking_services(duration);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE TRIGGER update_booking_services_updated_at
  BEFORE UPDATE ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

-- Customers can view their own booking services
CREATE POLICY "Customers can view own booking services" ON booking_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = booking_services.booking_id
      AND c.profile_id = auth.uid()
    )
  );

-- Staff can view assigned booking services
CREATE POLICY "Staff can view assigned booking services" ON booking_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN staff s ON s.id = b.staff_id
      WHERE b.id = booking_services.booking_id
      AND s.profile_id = auth.uid()
    )
  );

-- Hotels can view their booking services
CREATE POLICY "Hotels can view their booking services" ON booking_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_services.booking_id
      AND b.hotel_id IN (
        SELECT id FROM hotels WHERE true -- Simplified hotel auth for now
      )
    )
  );

-- Admins can view all booking services
CREATE POLICY "Admins can view all booking services" ON booking_services
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Only authenticated users can insert booking services (through booking creation)
CREATE POLICY "Authenticated users can create booking services" ON booking_services
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Admins can manage all booking services
CREATE POLICY "Admins can manage all booking services" ON booking_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- CONSTRAINTS
-- ============================================

-- Ensure recipient_index is valid (0-based)
ALTER TABLE booking_services
  ADD CONSTRAINT booking_services_recipient_index_valid
  CHECK (recipient_index >= 0 AND recipient_index <= 10);

-- Ensure positive duration and price
ALTER TABLE booking_services
  ADD CONSTRAINT booking_services_duration_positive
  CHECK (duration > 0);

ALTER TABLE booking_services
  ADD CONSTRAINT booking_services_price_positive
  CHECK (price >= 0);

-- Ensure sort_order is valid
ALTER TABLE booking_services
  ADD CONSTRAINT booking_services_sort_order_valid
  CHECK (sort_order >= 0);

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON booking_services TO authenticated;
GRANT INSERT ON booking_services TO authenticated;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get total booking services price
CREATE OR REPLACE FUNCTION get_booking_services_total(p_booking_id UUID)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(price) FROM booking_services WHERE booking_id = p_booking_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total booking services duration
CREATE OR REPLACE FUNCTION get_booking_services_total_duration(
  p_booking_id UUID,
  p_format TEXT DEFAULT 'single'
)
RETURNS INTEGER AS $$
DECLARE
  total_duration INTEGER;
  max_duration INTEGER;
BEGIN
  CASE p_format
    WHEN 'single' THEN
      -- For single person, just sum all durations
      SELECT COALESCE(SUM(duration), 0) INTO total_duration
      FROM booking_services
      WHERE booking_id = p_booking_id;

    WHEN 'simultaneous' THEN
      -- For simultaneous services, take the maximum duration across recipients
      SELECT COALESCE(MAX(recipient_duration), 0) INTO total_duration
      FROM (
        SELECT recipient_index, SUM(duration) as recipient_duration
        FROM booking_services
        WHERE booking_id = p_booking_id
        GROUP BY recipient_index
      ) recipient_totals;

    WHEN 'sequential' THEN
      -- For sequential services, sum all durations + buffer time
      SELECT COALESCE(SUM(duration), 0) INTO total_duration
      FROM booking_services
      WHERE booking_id = p_booking_id;

      -- Add 15 minutes buffer time if more than one service
      IF (SELECT COUNT(*) FROM booking_services WHERE booking_id = p_booking_id) > 1 THEN
        total_duration := total_duration + 15;
      END IF;

    ELSE
      total_duration := 0;
  END CASE;

  RETURN total_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE booking_services IS 'Junction table for multi-service bookings';
COMMENT ON COLUMN booking_services.booking_id IS 'Reference to the parent booking';
COMMENT ON COLUMN booking_services.service_id IS 'Reference to the selected service';
COMMENT ON COLUMN booking_services.duration IS 'Duration in minutes for this specific service in this booking';
COMMENT ON COLUMN booking_services.price IS 'Price for this service in this booking (may differ from base price)';
COMMENT ON COLUMN booking_services.recipient_index IS '0-based index for multi-recipient bookings (0=person 1, 1=person 2)';
COMMENT ON COLUMN booking_services.recipient_name IS 'Optional name for the recipient of this service';
COMMENT ON COLUMN booking_services.sort_order IS 'Order of services within the booking for display purposes';

COMMENT ON FUNCTION get_booking_services_total IS 'Calculate total price for all services in a booking';
COMMENT ON FUNCTION get_booking_services_total_duration IS 'Calculate total duration for booking services based on service format';