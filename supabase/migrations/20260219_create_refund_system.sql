-- Migration: Create Refund System
-- Description: Add refund_transactions table and refund-related columns to bookings
-- Version: 20260219

-- ============================================
-- Add refund columns to bookings table
-- ============================================

-- Add cancellation and refund fields to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_percentage DECIMAL(5,2);

-- Create index for cancelled bookings
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled ON bookings(status) WHERE status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(refund_status) WHERE refund_status IS NOT NULL AND refund_status != 'none';

-- ============================================
-- Create refund_transactions table
-- ============================================

CREATE TABLE IF NOT EXISTS refund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Refund details
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_percentage DECIMAL(5,2),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'none', 'pending', 'processing', 'completed', 'failed'

  -- Metadata
  reason TEXT,
  initiated_by UUID REFERENCES profiles(id),

  -- Omise reference
  omise_refund_id TEXT,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refund_transactions_booking ON refund_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_status ON refund_transactions(status);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_created ON refund_transactions(created_at DESC);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_refund_transactions_updated_at ON refund_transactions;
CREATE TRIGGER update_refund_transactions_updated_at
  BEFORE UPDATE ON refund_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Create cancellation_notifications table
-- ============================================

CREATE TABLE IF NOT EXISTS cancellation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Recipient info
  recipient_type TEXT NOT NULL, -- 'customer', 'staff', 'hotel'
  recipient_id UUID NOT NULL,

  -- Notification details
  channel TEXT NOT NULL, -- 'email', 'in_app', 'line'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'

  -- Error handling
  error_message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_notifications_booking ON cancellation_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_notifications_recipient ON cancellation_notifications(recipient_type, recipient_id);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_notifications ENABLE ROW LEVEL SECURITY;

-- Refund transactions policies
CREATE POLICY "Admins can manage refund transactions" ON refund_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Customers can view own refund transactions" ON refund_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.id = refund_transactions.booking_id
      AND c.profile_id = auth.uid()
    )
  );

-- Cancellation notifications policies
CREATE POLICY "Admins can manage cancellation notifications" ON cancellation_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- Grant permissions
-- ============================================

GRANT SELECT ON refund_transactions TO authenticated;
GRANT SELECT ON cancellation_notifications TO authenticated;

-- Service role needs full access for backend operations
GRANT ALL ON refund_transactions TO service_role;
GRANT ALL ON cancellation_notifications TO service_role;
