-- Migration: Create Payment Methods Table
-- Description: Saved payment methods (tokenized cards from Omise)
-- Version: 015

-- Saved payment methods (tokenized cards from Omise)
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  omise_card_id TEXT NOT NULL, -- Omise token reference
  card_brand TEXT NOT NULL, -- 'Visa', 'Mastercard', etc.
  card_last_digits TEXT NOT NULL,
  card_expiry_month INTEGER NOT NULL,
  card_expiry_year INTEGER NOT NULL,
  cardholder_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_methods_customer ON payment_methods(customer_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(customer_id, is_default) WHERE is_default = true;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own payment methods" ON payment_methods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = payment_methods.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Customers can manage own payment methods" ON payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = payment_methods.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;
