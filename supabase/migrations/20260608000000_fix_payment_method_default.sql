-- Fix payment_method default value to prevent race condition
-- Issue: DEFAULT 'cash' causes all bookings to show as cash initially
-- Solution: Change default to 'pending_payment' and ensure explicit setting

-- First, update existing 'cash' records that should be 'pending_payment'
-- (Only update records where payment_status is 'pending' - these are likely incorrectly defaulted)
UPDATE bookings
SET payment_method = 'pending_payment'
WHERE payment_method = 'cash'
  AND payment_status = 'pending'
  AND created_at > '2026-06-08'::date; -- Only recent records

-- Change the default value from 'cash' to 'pending_payment'
ALTER TABLE bookings
ALTER COLUMN payment_method SET DEFAULT 'pending_payment';

-- Add comment explaining the fix
COMMENT ON COLUMN bookings.payment_method IS 'Method used for payment: cash, credit_card, promptpay, bank_transfer, other. Default pending_payment prevents race conditions.';

-- Update any existing NULL values to pending_payment
UPDATE bookings
SET payment_method = 'pending_payment'
WHERE payment_method IS NULL;