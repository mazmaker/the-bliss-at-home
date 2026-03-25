-- ========================================
-- Hotel App: Extend Session Feature Support
-- Date: 2026-03-24
-- Description: Add database support for booking extensions
-- ========================================

-- Add extension tracking columns to booking_services table
ALTER TABLE booking_services
ADD COLUMN IF NOT EXISTS is_extension BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extended_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS original_booking_service_id UUID NULL;

-- Add extension summary columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_extended_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS total_extensions_price DECIMAL(10,2) DEFAULT 0;

-- Add foreign key constraint for original booking service reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_booking_services_original'
        AND table_name = 'booking_services'
    ) THEN
        ALTER TABLE booking_services
        ADD CONSTRAINT fk_booking_services_original
        FOREIGN KEY (original_booking_service_id)
        REFERENCES booking_services(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_booking_services_extension
ON booking_services(booking_id, is_extension);

CREATE INDEX IF NOT EXISTS idx_booking_services_original
ON booking_services(original_booking_service_id)
WHERE original_booking_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_extension_count
ON bookings(extension_count)
WHERE extension_count > 0;

CREATE INDEX IF NOT EXISTS idx_bookings_last_extended
ON bookings(last_extended_at)
WHERE last_extended_at IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN booking_services.is_extension IS 'True if this service is an extension of original booking';
COMMENT ON COLUMN booking_services.extended_at IS 'Timestamp when this extension was added';
COMMENT ON COLUMN booking_services.original_booking_service_id IS 'Reference to original booking service that was extended';
COMMENT ON COLUMN bookings.extension_count IS 'Number of times this booking has been extended';
COMMENT ON COLUMN bookings.last_extended_at IS 'Timestamp of most recent extension';
COMMENT ON COLUMN bookings.total_extensions_price IS 'Total price of all extensions added to this booking';

-- ========================================
-- Create function to automatically update booking totals
-- ========================================
CREATE OR REPLACE FUNCTION update_booking_extension_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an extension
  IF NEW.is_extension = TRUE THEN
    UPDATE bookings
    SET
      extension_count = extension_count + 1,
      last_extended_at = NEW.extended_at,
      total_extensions_price = total_extensions_price + NEW.price,
      final_price = final_price + NEW.price,
      updated_at = NOW()
    WHERE id = NEW.booking_id;

    RAISE NOTICE 'Extension added to booking %. New extension count: %, Extension price: %',
                 NEW.booking_id,
                 (SELECT extension_count FROM bookings WHERE id = NEW.booking_id),
                 NEW.price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update booking when extension is added
DROP TRIGGER IF EXISTS trigger_update_booking_extension_totals ON booking_services;
CREATE TRIGGER trigger_update_booking_extension_totals
  AFTER INSERT ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_extension_totals();

-- ========================================
-- Create helper function to get extension summary
-- ========================================
CREATE OR REPLACE FUNCTION get_booking_extension_summary(booking_id_param UUID)
RETURNS TABLE (
  original_services_count INTEGER,
  extension_services_count INTEGER,
  total_original_price DECIMAL(10,2),
  total_extension_price DECIMAL(10,2),
  total_duration INTEGER,
  first_extension_at TIMESTAMP,
  last_extension_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN bs.is_extension = FALSE THEN 1 END)::INTEGER as original_services_count,
    COUNT(CASE WHEN bs.is_extension = TRUE THEN 1 END)::INTEGER as extension_services_count,
    SUM(CASE WHEN bs.is_extension = FALSE THEN bs.price ELSE 0 END) as total_original_price,
    SUM(CASE WHEN bs.is_extension = TRUE THEN bs.price ELSE 0 END) as total_extension_price,
    SUM(bs.duration)::INTEGER as total_duration,
    MIN(CASE WHEN bs.is_extension = TRUE THEN bs.extended_at ELSE NULL END) as first_extension_at,
    MAX(CASE WHEN bs.is_extension = TRUE THEN bs.extended_at ELSE NULL END) as last_extension_at
  FROM booking_services bs
  WHERE bs.booking_id = booking_id_param;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Insert test data (optional - for development only)
-- ========================================
DO $$
DECLARE
    test_booking_id UUID;
    test_service_id UUID;
    original_booking_service_id UUID;
BEGIN
    -- Only insert test data if this is development environment
    IF current_setting('app.environment', true) = 'development' THEN

        RAISE NOTICE 'Adding test extension data for development...';

        -- Find a test booking to extend (use first available hotel booking)
        SELECT id INTO test_booking_id
        FROM bookings
        WHERE is_hotel_booking = true
        AND status = 'confirmed'
        LIMIT 1;

        IF test_booking_id IS NOT NULL THEN
            -- Get the original service and booking service
            SELECT bs.service_id, bs.id INTO test_service_id, original_booking_service_id
            FROM booking_services bs
            WHERE bs.booking_id = test_booking_id
            AND bs.is_extension = FALSE
            LIMIT 1;

            -- Add a test extension (60 minutes for 552 THB)
            INSERT INTO booking_services (
                booking_id,
                service_id,
                duration,
                price,
                recipient_index,
                recipient_name,
                sort_order,
                is_extension,
                extended_at,
                original_booking_service_id
            ) VALUES (
                test_booking_id,
                test_service_id,
                60,  -- 60 minutes extension
                552.00,  -- Hotel rate price
                0,  -- Same recipient as original
                (SELECT recipient_name FROM booking_services WHERE id = original_booking_service_id),
                (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM booking_services WHERE booking_id = test_booking_id),
                TRUE,
                NOW(),
                original_booking_service_id
            );

            RAISE NOTICE 'Test extension added to booking %', test_booking_id;
        ELSE
            RAISE NOTICE 'No suitable test booking found for extension demo';
        END IF;
    END IF;
END $$;

-- ========================================
-- Verification queries
-- ========================================

-- Verify schema changes
SELECT
    'Schema verification:' as status,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='booking_services' AND column_name='is_extension') as has_is_extension,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='booking_services' AND column_name='extended_at') as has_extended_at,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='extension_count') as has_extension_count;

-- Show sample data
SELECT
    '=== Sample Extension Data ===' as section,
    b.booking_number,
    b.extension_count,
    b.total_extensions_price,
    b.final_price
FROM bookings b
WHERE b.extension_count > 0
LIMIT 3;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Hotel App Extend Session Feature: Database migration completed successfully!';
END $$;