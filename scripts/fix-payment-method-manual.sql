-- Manual fix payment method for booking BK20260608-0354
-- User confirmed payment was made via credit card but system shows cash

UPDATE bookings
SET
    payment_method = 'credit_card',
    payment_method_recorded = 'credit_card',
    updated_at = NOW()
WHERE booking_number = 'BK20260608-0354';

-- Verify the update
SELECT booking_number, payment_method, payment_method_recorded, payment_status, status
FROM bookings
WHERE booking_number = 'BK20260608-0354';