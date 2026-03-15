-- Migration: Add booking cancellation and refund support
-- Created: 2026-02-19

-- ============================================
-- 1. Add cancellation and refund fields to bookings table
-- ============================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none', 'pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS refund_percentage INTEGER CHECK (refund_percentage >= 0 AND refund_percentage <= 100);

-- Add index for cancelled bookings queries
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(refund_status) WHERE refund_status IS NOT NULL;

-- ============================================
-- 2. Create refund_transactions table
-- ============================================

CREATE TABLE IF NOT EXISTS refund_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_percentage INTEGER CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reason TEXT,
  initiated_by UUID REFERENCES profiles(id),
  omise_refund_id TEXT UNIQUE, -- Omise refund ID for tracking
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_refund_transactions_booking_id ON refund_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_status ON refund_transactions(status);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_omise_refund_id ON refund_transactions(omise_refund_id) WHERE omise_refund_id IS NOT NULL;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_refund_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_refund_transactions_updated_at
  BEFORE UPDATE ON refund_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_refund_transactions_updated_at();

-- ============================================
-- 3. Create cancellation_notifications table
-- ============================================

CREATE TABLE IF NOT EXISTS cancellation_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'staff', 'hotel')),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'line')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint: customer can only use email and in_app channels
ALTER TABLE cancellation_notifications
  ADD CONSTRAINT customer_channel_check
  CHECK (
    recipient_type != 'customer' OR
    channel IN ('email', 'in_app')
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_notifications_booking_id ON cancellation_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_notifications_recipient ON cancellation_notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_cancellation_notifications_status ON cancellation_notifications(status);

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS Policies for refund_transactions
-- ============================================

-- Admins can view all refund transactions
DROP POLICY IF EXISTS "Admins can view all refund transactions" ON refund_transactions;
CREATE POLICY "Admins can view all refund transactions" ON refund_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can insert refund transactions
DROP POLICY IF EXISTS "Admins can insert refund transactions" ON refund_transactions;
CREATE POLICY "Admins can insert refund transactions" ON refund_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update refund transactions
DROP POLICY IF EXISTS "Admins can update refund transactions" ON refund_transactions;
CREATE POLICY "Admins can update refund transactions" ON refund_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Customers can view their own refund transactions
DROP POLICY IF EXISTS "Customers can view own refund transactions" ON refund_transactions;
CREATE POLICY "Customers can view own refund transactions" ON refund_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = refund_transactions.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

-- ============================================
-- 6. Create RLS Policies for cancellation_notifications
-- ============================================

-- Admins can view all cancellation notifications
DROP POLICY IF EXISTS "Admins can view all cancellation notifications" ON cancellation_notifications;
CREATE POLICY "Admins can view all cancellation notifications" ON cancellation_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can view their own cancellation notifications
DROP POLICY IF EXISTS "Users can view own cancellation notifications" ON cancellation_notifications;
CREATE POLICY "Users can view own cancellation notifications" ON cancellation_notifications
  FOR SELECT
  USING (recipient_id = auth.uid());

-- System can insert cancellation notifications (via service role)
DROP POLICY IF EXISTS "System can insert cancellation notifications" ON cancellation_notifications;
CREATE POLICY "System can insert cancellation notifications" ON cancellation_notifications
  FOR INSERT
  WITH CHECK (true); -- Will be executed with service role key

-- System can update cancellation notifications status
DROP POLICY IF EXISTS "System can update cancellation notifications" ON cancellation_notifications;
CREATE POLICY "System can update cancellation notifications" ON cancellation_notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7. Add comments for documentation
-- ============================================

COMMENT ON TABLE refund_transactions IS 'Tracks all refund transactions for cancelled bookings';
COMMENT ON COLUMN refund_transactions.omise_refund_id IS 'Omise refund ID for tracking refund status';
COMMENT ON COLUMN refund_transactions.status IS 'Refund status: pending, processing, completed, failed';

COMMENT ON TABLE cancellation_notifications IS 'Tracks all notifications sent when a booking is cancelled';
COMMENT ON COLUMN cancellation_notifications.recipient_type IS 'Type of recipient: customer, staff, hotel';
COMMENT ON COLUMN cancellation_notifications.channel IS 'Notification channel: email, in_app, line (customers can only use email and in_app)';

COMMENT ON COLUMN bookings.cancellation_reason IS 'Reason provided when the booking was cancelled';
COMMENT ON COLUMN bookings.cancelled_by IS 'Profile ID of user who cancelled the booking (usually admin)';
COMMENT ON COLUMN bookings.refund_status IS 'Status of refund: none, pending, processing, completed, failed';
