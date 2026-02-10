-- Migration: Create Transactions Table
-- Description: Payment transactions (separate from bookings for better tracking)
-- Version: 016

-- Payment transactions (separate from bookings for better tracking)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT UNIQUE NOT NULL,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE SET NULL,

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'THB',
  payment_method TEXT NOT NULL, -- 'credit_card', 'promptpay', 'cash', 'internet_banking'
  payment_provider TEXT, -- 'omise', 'cash', null

  -- Card details (for card payments)
  card_brand TEXT,
  card_last_digits TEXT,

  -- Omise references
  omise_charge_id TEXT,
  omise_transaction_id TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'successful', 'failed', 'refunded'

  -- Description
  description TEXT NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Receipt
  receipt_url TEXT,

  -- Timestamps
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate transaction number sequence
CREATE SEQUENCE transaction_number_seq START 1;

-- Function to generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Set default for transaction_number
ALTER TABLE transactions ALTER COLUMN transaction_number SET DEFAULT generate_transaction_number();

-- Indexes
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = transactions.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Grant permissions
GRANT SELECT ON transactions TO authenticated;
