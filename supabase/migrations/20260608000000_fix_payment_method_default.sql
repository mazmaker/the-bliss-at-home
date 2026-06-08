-- Fix payment_method default value to prevent race condition
-- Issue: DEFAULT 'cash' causes all bookings to show as cash initially
-- Solution: Add 'pending_payment' to enum and use as default

-- Step 1: Add 'pending_payment' to the payment_method enum
ALTER TYPE payment_method ADD VALUE 'pending_payment';

-- Step 2: Update existing problematic 'cash' records that should be 'pending_payment'
-- (Only update records where payment_status is 'pending' - these are likely incorrectly defaulted)
UPDATE bookings
SET payment_method = 'pending_payment'
WHERE payment_method = 'cash'
  AND payment_status = 'pending'
  AND created_at > '2026-06-08'::date; -- Only recent records

-- Step 3: Change the default value from 'cash' to 'pending_payment'
ALTER TABLE bookings
ALTER COLUMN payment_method SET DEFAULT 'pending_payment';

-- Step 4: Add comment explaining the fix
COMMENT ON COLUMN bookings.payment_method IS 'Method used for payment: cash, credit_card, promptpay, bank_transfer, other, pending_payment. Default pending_payment prevents race conditions.';

-- Step 5: Update any existing NULL values to pending_payment
UPDATE bookings
SET payment_method = 'pending_payment'
WHERE payment_method IS NULL;