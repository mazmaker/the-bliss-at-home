-- Migration: Add Missing Booking Fields for Admin Quick Booking
-- Description: Add commission_amount, customer_name, customer_phone columns
-- Version: 221
-- Date: 2026-06-03

-- ============================================
-- ADD MISSING FIELDS TO BOOKINGS TABLE
-- ============================================

-- Add commission amount field for staff earnings tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  commission_amount DECIMAL(10,2) DEFAULT 0;

-- Add customer contact fields for admin booking workflow
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  customer_name TEXT;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  customer_phone TEXT;

-- Add payment method field (was referenced in admin booking code)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  payment_method TEXT;

-- ============================================
-- ADD CONSTRAINTS AND COMMENTS
-- ============================================

-- Add constraint for payment_method values
ALTER TABLE bookings ADD CONSTRAINT IF NOT EXISTS check_payment_method
  CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'promptpay', 'voucher', 'other') OR payment_method IS NULL);

-- Add comments for new fields
COMMENT ON COLUMN bookings.commission_amount IS 'Commission amount calculated for staff member (THB)';
COMMENT ON COLUMN bookings.customer_name IS 'Customer name entered during admin booking (may differ from customers.full_name)';
COMMENT ON COLUMN bookings.customer_phone IS 'Customer phone entered during admin booking (may differ from customers.phone)';
COMMENT ON COLUMN bookings.payment_method IS 'Payment method selected during admin booking process';

-- ============================================
-- CREATE INDEXES FOR NEW FIELDS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bookings_commission ON bookings(commission_amount) WHERE commission_amount > 0;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_name ON bookings(customer_name) WHERE customer_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);

-- ============================================
-- UPDATE TRIGGER TO HANDLE COMMISSION CALCULATION
-- ============================================

-- Function to automatically calculate commission if not set
CREATE OR REPLACE FUNCTION auto_calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate commission if not already set and service exists
  IF NEW.commission_amount IS NULL OR NEW.commission_amount = 0 THEN
    -- Get commission rate from service
    SELECT
      COALESCE(staff_commission_rate, 30) * NEW.final_price / 100
    INTO NEW.commission_amount
    FROM services
    WHERE id = NEW.service_id;

    -- Ensure commission is rounded to 2 decimal places
    NEW.commission_amount = ROUND(NEW.commission_amount, 2);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto commission calculation
DROP TRIGGER IF EXISTS auto_commission_trigger ON bookings;
CREATE TRIGGER auto_commission_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_commission();

-- ============================================
-- MIGRATION VERIFICATION
-- ============================================

-- Verify new columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'commission_amount'
  ) THEN
    RAISE EXCEPTION 'Migration failed: commission_amount column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_name'
  ) THEN
    RAISE EXCEPTION 'Migration failed: customer_name column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_phone'
  ) THEN
    RAISE EXCEPTION 'Migration failed: customer_phone column not created';
  END IF;

  RAISE NOTICE 'Migration 221 completed successfully: Added commission_amount, customer_name, customer_phone, payment_method columns';
END $$;