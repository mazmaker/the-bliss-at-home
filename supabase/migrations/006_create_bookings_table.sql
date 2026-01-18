-- Migration: Create Bookings Table
-- Description: Core booking transactions
-- Version: 006

-- ============================================
-- BOOKINGS TABLE
-- ============================================

-- Generate booking number function
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'BK' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('booking_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE booking_number_seq START 1;

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL DEFAULT generate_booking_number(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES services(id),

  -- Booking details
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes

  -- Location
  is_hotel_booking BOOLEAN DEFAULT false,
  hotel_room_number TEXT,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,

  -- Status
  status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',

  -- Staff earnings
  staff_earnings DECIMAL(10,2) DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0,

  -- Notes
  customer_notes TEXT,
  staff_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX idx_bookings_staff ON bookings(staff_id);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_number ON bookings(booking_number);

-- Composite index for active bookings queries
CREATE INDEX idx_bookings_active ON bookings(status, booking_date) WHERE status NOT IN ('completed', 'cancelled');

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Customers can view own bookings
CREATE POLICY "Customers can view own bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = bookings.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Customers can create bookings
CREATE POLICY "Customers can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = bookings.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Staff can view assigned bookings
CREATE POLICY "Staff can view assigned bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = bookings.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

-- Hotels can view their bookings
CREATE POLICY "Hotels can view their bookings" ON bookings
  FOR SELECT USING (bookings.hotel_id IN (
    SELECT id FROM hotels WHERE -- TODO: link hotels to profiles
      true -- Simplified for now
  ));

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admins can manage all bookings
CREATE POLICY "Admins can manage all bookings" ON bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON bookings TO authenticated;
GRANT INSERT ON bookings TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE bookings IS 'Booking transactions';
COMMENT ON COLUMN bookings.booking_number IS 'Unique booking reference number';
COMMENT ON COLUMN bookings.staff_earnings IS 'Earnings for the service provider';
COMMENT ON COLUMN bookings.tip_amount IS 'Tip amount for the service provider';
