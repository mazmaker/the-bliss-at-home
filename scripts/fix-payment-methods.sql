-- Fix payment methods for bookings with successful credit card transactions
-- This script corrects bookings where payment_method is 'cash' but should be 'credit_card'

-- Update bookings to 'credit_card' where:
-- 1. payment_method is currently 'cash'
-- 2. There's a successful credit card transaction linked to the booking
-- 3. The transaction's payment_method is 'credit_card'

UPDATE bookings
SET
  payment_method = 'credit_card',
  updated_at = NOW()
WHERE
  payment_method = 'cash'
  AND payment_status IN ('paid', 'refunded')
  AND id IN (
    SELECT DISTINCT booking_id
    FROM transactions
    WHERE
      payment_method = 'credit_card'
      AND status IN ('successful', 'refunded')
      AND booking_id IS NOT NULL
      -- Only update recent bookings (last 30 days)
      AND created_at > NOW() - INTERVAL '30 days'
  );

-- Show the results
SELECT
  b.booking_number,
  b.payment_method AS booking_payment_method,
  t.payment_method AS transaction_payment_method,
  t.status AS transaction_status,
  b.payment_status AS booking_payment_status,
  b.created_at
FROM bookings b
JOIN transactions t ON b.id = t.booking_id
WHERE
  t.payment_method = 'credit_card'
  AND t.status IN ('successful', 'refunded')
  AND b.created_at > NOW() - INTERVAL '30 days'
ORDER BY b.created_at DESC
LIMIT 20;