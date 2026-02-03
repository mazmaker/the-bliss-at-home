-- Migration: Add omise_customer_id to payment_methods
-- Description: Store Omise Customer ID for persistent card storage
-- Date: 2026-02-03

-- Add omise_customer_id column to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN omise_customer_id TEXT;

-- Update comment on omise_card_id column
COMMENT ON COLUMN payment_methods.omise_card_id IS 'Omise card ID (from customer.cards.data[].id)';
COMMENT ON COLUMN payment_methods.omise_customer_id IS 'Omise customer ID (cust_xxx) for persistent card storage';
