-- Migration: Add Extension Support for Customer App
-- Date: 2026-04-02
-- Purpose: Ensure all extension-related columns and indexes exist

-- Add extension columns to booking_services if they don't exist
ALTER TABLE booking_services
ADD COLUMN IF NOT EXISTS is_extension BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_booking_service_id UUID REFERENCES booking_services(id);

-- Add extension tracking columns to bookings if they don't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_extended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_extensions_price DECIMAL(10,2) DEFAULT 0;

-- Create booking_promotions table for tracking promotion usage in extensions
CREATE TABLE IF NOT EXISTS booking_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT DEFAULT 'customer', -- 'customer', 'admin', 'hotel_staff'
  booking_type TEXT DEFAULT 'regular', -- 'regular', 'extension'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_services_is_extension
ON booking_services(is_extension) WHERE is_extension = TRUE;

CREATE INDEX IF NOT EXISTS idx_booking_services_original_booking_service_id
ON booking_services(original_booking_service_id) WHERE original_booking_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_extension_count
ON bookings(extension_count) WHERE extension_count > 0;

CREATE INDEX IF NOT EXISTS idx_booking_promotions_booking_id
ON booking_promotions(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_promotions_applied_at
ON booking_promotions(applied_at);

-- Add RLS policies for booking_promotions
ALTER TABLE booking_promotions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own booking promotions
CREATE POLICY "Users can view their own booking promotions" ON booking_promotions
FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings WHERE profile_id = auth.uid()
  )
);

-- Policy: Users can insert promotions for their own bookings
CREATE POLICY "Users can insert promotions for their own bookings" ON booking_promotions
FOR INSERT WITH CHECK (
  booking_id IN (
    SELECT id FROM bookings WHERE profile_id = auth.uid()
  )
);

-- Policy: Admins can manage all booking promotions
CREATE POLICY "Admins can manage all booking promotions" ON booking_promotions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Update existing booking_services to set is_extension = FALSE where NULL
UPDATE booking_services
SET is_extension = FALSE
WHERE is_extension IS NULL;

-- Set NOT NULL constraint after updating existing data
ALTER TABLE booking_services
ALTER COLUMN is_extension SET NOT NULL,
ALTER COLUMN is_extension SET DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON TABLE booking_promotions IS 'Tracks promotion/discount usage for both regular bookings and extensions';
COMMENT ON COLUMN booking_services.is_extension IS 'TRUE if this service is an extension of original booking';
COMMENT ON COLUMN booking_services.extended_at IS 'Timestamp when extension was created';
COMMENT ON COLUMN booking_services.original_booking_service_id IS 'Reference to original booking_service that was extended';
COMMENT ON COLUMN bookings.extension_count IS 'Number of times this booking has been extended';
COMMENT ON COLUMN bookings.last_extended_at IS 'Timestamp of most recent extension';

-- Grant necessary permissions
GRANT SELECT, INSERT ON booking_promotions TO authenticated;
GRANT USAGE ON SEQUENCE booking_promotions_id_seq TO authenticated;