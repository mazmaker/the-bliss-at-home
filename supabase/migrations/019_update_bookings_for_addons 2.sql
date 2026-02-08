-- Migration: Update Bookings Table for Add-ons
-- Description: Add addons_total column to bookings table
-- Version: 019

-- Add addons_total to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS addons_total DECIMAL(10,2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN bookings.addons_total IS 'Total price of selected add-ons';
