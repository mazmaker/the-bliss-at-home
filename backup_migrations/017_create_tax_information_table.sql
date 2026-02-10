-- Migration: Create Tax Information Table
-- Description: Tax information for invoice generation
-- Version: 017

-- Tax information for invoice generation
CREATE TABLE tax_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Tax type
  tax_type TEXT NOT NULL, -- 'individual', 'company'

  -- Tax ID
  tax_id TEXT NOT NULL,

  -- Company details (for company type)
  company_name TEXT,
  branch_code TEXT,

  -- Tax address
  address_line TEXT NOT NULL,
  subdistrict TEXT,
  district TEXT,
  province TEXT NOT NULL,
  zipcode TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tax_information_customer ON tax_information(customer_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_tax_information_updated_at
  BEFORE UPDATE ON tax_information
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE tax_information ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own tax info" ON tax_information
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = tax_information.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Customers can manage own tax info" ON tax_information
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = tax_information.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tax_information TO authenticated;
