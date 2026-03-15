-- Add payment_method column to bookings table
-- This allows tracking how customers pay for bookings (cash, credit card, QR code, etc.)

-- Create payment method enum
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'promptpay', 'bank_transfer', 'other');

-- Add payment_method column to bookings table
ALTER TABLE bookings
ADD COLUMN payment_method payment_method DEFAULT 'cash';

-- Add comment
COMMENT ON COLUMN bookings.payment_method IS 'Method used for payment: cash, credit_card, promptpay, bank_transfer, other';
