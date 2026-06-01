-- Create payment_records table for admin recording of customer payment methods
-- This is NOT for actual payment processing, just for admin recording purposes

-- First, create the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now create the payment_records table
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer and booking references
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Payment information
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'promptpay', 'voucher', 'other')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),

  -- Notes
  payment_notes TEXT,
  admin_notes TEXT,

  -- Admin who recorded this
  recorded_by UUID NOT NULL REFERENCES profiles(id),

  -- Status and timing
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'verified', 'cancelled')),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Standard timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_records_customer_id ON payment_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_booking_id ON payment_records(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_records_recorded_by ON payment_records(recorded_by);
CREATE INDEX IF NOT EXISTS idx_payment_records_recorded_at ON payment_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

-- Add updated_at trigger (now the function exists)
CREATE OR REPLACE TRIGGER payment_records_updated_at
  BEFORE UPDATE ON payment_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Admin can view all payment records
CREATE POLICY "Admins can view all payment records" ON payment_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin can insert payment records
CREATE POLICY "Admins can insert payment records" ON payment_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    AND recorded_by = auth.uid()
  );

-- Admin can update payment records they created
CREATE POLICY "Admins can update their payment records" ON payment_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    AND recorded_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    AND recorded_by = auth.uid()
  );

-- Super admin can delete payment records
CREATE POLICY "Super admins can delete payment records" ON payment_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Grant necessary permissions
GRANT ALL ON payment_records TO authenticated;
GRANT ALL ON payment_records TO anon;

-- Add table comment
COMMENT ON TABLE payment_records IS 'Admin records of customer payment methods for reporting purposes. Not for actual payment processing.';
COMMENT ON COLUMN payment_records.payment_method IS 'Method used by customer: cash, bank_transfer, credit_card, promptpay, voucher, other';
COMMENT ON COLUMN payment_records.amount IS 'Amount in THB that customer paid';
COMMENT ON COLUMN payment_records.payment_notes IS 'Notes about the payment (visible to customer)';
COMMENT ON COLUMN payment_records.admin_notes IS 'Internal admin notes (not visible to customer)';
COMMENT ON COLUMN payment_records.recorded_by IS 'Admin user who recorded this payment';
COMMENT ON COLUMN payment_records.status IS 'Status: recorded (default), verified, cancelled';