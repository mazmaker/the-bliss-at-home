-- Migration: Create Customers Table
-- Description: Customer profiles with booking history
-- Version: 005

-- ============================================
-- CUSTOMERS TABLE
-- ============================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  date_of_birth DATE,
  preferences JSONB DEFAULT '{}', -- store customer preferences
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_booking_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_customers_profile ON customers(profile_id);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers can view own data
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = customers.profile_id AND profiles.id = auth.uid())
  );

-- Customers can update own data
CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = customers.profile_id AND profiles.id = auth.uid())
  );

-- Admins can view all customers
CREATE POLICY "Admins can view all customers" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admins can manage customers
CREATE POLICY "Admins can manage customers" ON customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON customers TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE customers IS 'Customer profiles with booking history';
COMMENT ON COLUMN customers.preferences IS 'JSONB for storing customer preferences';
