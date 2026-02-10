-- Migration: Create Addresses Table
-- Description: Customer addresses for service delivery
-- Version: 014

-- Customer addresses table for multiple saved addresses
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- 'Home', 'Office', etc.
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  subdistrict TEXT,
  district TEXT,
  province TEXT NOT NULL,
  zipcode TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_addresses_customer ON addresses(customer_id);
CREATE INDEX idx_addresses_default ON addresses(customer_id, is_default) WHERE is_default = true;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own addresses" ON addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = addresses.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Customers can manage own addresses" ON addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = addresses.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all addresses" ON addresses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON addresses TO authenticated;
