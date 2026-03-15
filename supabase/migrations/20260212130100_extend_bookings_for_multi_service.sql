-- Migration: Extend Bookings Table for Multi-Service Support
-- Description: Add fields to support multi-service booking configurations
-- Version: 20260212130100

-- ============================================
-- EXTEND BOOKINGS TABLE
-- ============================================

-- Add new columns for multi-service support
ALTER TABLE bookings
  -- Multi-service configuration
  ADD COLUMN is_multi_service BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN service_format TEXT CHECK (service_format IN ('single', 'simultaneous', 'sequential')) DEFAULT 'single',
  ADD COLUMN recipient_count INTEGER NOT NULL DEFAULT 1,

  -- Calculated fields from booking_services
  ADD COLUMN total_calculated_duration INTEGER, -- Calculated from booking_services based on format
  ADD COLUMN services_total_price DECIMAL(10,2); -- Sum of all service prices

-- ============================================
-- UPDATE EXISTING DATA
-- ============================================

-- Set default values for existing bookings
UPDATE bookings SET
  is_multi_service = false,
  service_format = 'single',
  recipient_count = 1,
  total_calculated_duration = duration,
  services_total_price = base_price
WHERE is_multi_service IS NULL;

-- ============================================
-- INDEXES
-- ============================================

-- Add indexes for new columns
CREATE INDEX idx_bookings_multi_service ON bookings(is_multi_service);
CREATE INDEX idx_bookings_service_format ON bookings(service_format);
CREATE INDEX idx_bookings_recipient_count ON bookings(recipient_count);

-- Composite index for multi-service queries
CREATE INDEX idx_bookings_multi_service_format ON bookings(is_multi_service, service_format);

-- ============================================
-- CONSTRAINTS
-- ============================================

-- Ensure recipient_count is positive and reasonable
ALTER TABLE bookings
  ADD CONSTRAINT bookings_recipient_count_valid
  CHECK (recipient_count >= 1 AND recipient_count <= 10);

-- Ensure calculated fields are positive when set
ALTER TABLE bookings
  ADD CONSTRAINT bookings_calculated_duration_positive
  CHECK (total_calculated_duration IS NULL OR total_calculated_duration > 0);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_services_total_positive
  CHECK (services_total_price IS NULL OR services_total_price >= 0);

-- Logic constraint: multi-service bookings must have format
ALTER TABLE bookings
  ADD CONSTRAINT bookings_multi_service_format_required
  CHECK (
    (is_multi_service = false) OR
    (is_multi_service = true AND service_format IS NOT NULL)
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to sync calculated fields from booking_services
CREATE OR REPLACE FUNCTION sync_booking_calculated_fields(p_booking_id UUID)
RETURNS VOID AS $$
DECLARE
  booking_format TEXT;
  calculated_duration INTEGER;
  services_price DECIMAL(10,2);
  service_count INTEGER;
BEGIN
  -- Get the booking format
  SELECT service_format INTO booking_format
  FROM bookings
  WHERE id = p_booking_id;

  -- Get service count for this booking
  SELECT COUNT(*) INTO service_count
  FROM booking_services
  WHERE booking_id = p_booking_id;

  -- Calculate total duration based on format
  SELECT get_booking_services_total_duration(p_booking_id, booking_format)
  INTO calculated_duration;

  -- Calculate total services price
  SELECT get_booking_services_total(p_booking_id)
  INTO services_price;

  -- Update the booking with calculated values
  UPDATE bookings SET
    total_calculated_duration = calculated_duration,
    services_total_price = services_price,
    is_multi_service = (service_count > 1),
    updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create booking with services
CREATE OR REPLACE FUNCTION create_booking_with_services(
  p_booking_data JSONB,
  p_services JSONB
)
RETURNS UUID AS $$
DECLARE
  booking_id UUID;
  service_item JSONB;
  service_format TEXT;
  recipient_count INTEGER;
BEGIN
  -- Generate new booking ID
  booking_id := gen_random_uuid();

  -- Extract service configuration
  service_format := COALESCE((p_booking_data->>'service_format')::TEXT, 'single');
  recipient_count := COALESCE((p_booking_data->>'recipient_count')::INTEGER, 1);

  -- Create the main booking record
  INSERT INTO bookings (
    id,
    booking_number,
    customer_id,
    hotel_id,
    service_id, -- Keep for backward compatibility (use first service)
    booking_date,
    booking_time,
    duration, -- Keep for backward compatibility (use calculated duration)
    is_hotel_booking,
    hotel_room_number,
    address,
    latitude,
    longitude,
    base_price, -- Keep for backward compatibility (use total services price)
    discount_amount,
    final_price,
    customer_notes,
    -- New multi-service fields
    is_multi_service,
    service_format,
    recipient_count
  ) VALUES (
    booking_id,
    generate_booking_number(),
    (p_booking_data->>'customer_id')::UUID,
    (p_booking_data->>'hotel_id')::UUID,
    (p_services->0->>'service_id')::UUID, -- First service for compatibility
    (p_booking_data->>'booking_date')::DATE,
    (p_booking_data->>'booking_time')::TIME,
    (p_services->0->>'duration')::INTEGER, -- First service duration for compatibility
    COALESCE((p_booking_data->>'is_hotel_booking')::BOOLEAN, false),
    p_booking_data->>'hotel_room_number',
    p_booking_data->>'address',
    (p_booking_data->>'latitude')::DECIMAL,
    (p_booking_data->>'longitude')::DECIMAL,
    (p_services->0->>'price')::DECIMAL(10,2), -- First service price for compatibility
    COALESCE((p_booking_data->>'discount_amount')::DECIMAL(10,2), 0),
    (p_booking_data->>'final_price')::DECIMAL(10,2),
    p_booking_data->>'customer_notes',
    -- Multi-service fields
    (jsonb_array_length(p_services) > 1),
    service_format,
    recipient_count
  );

  -- Insert booking services
  FOR service_item IN SELECT * FROM jsonb_array_elements(p_services)
  LOOP
    INSERT INTO booking_services (
      booking_id,
      service_id,
      duration,
      price,
      recipient_index,
      recipient_name,
      sort_order
    ) VALUES (
      booking_id,
      (service_item->>'service_id')::UUID,
      (service_item->>'duration')::INTEGER,
      (service_item->>'price')::DECIMAL(10,2),
      COALESCE((service_item->>'recipient_index')::INTEGER, 0),
      service_item->>'recipient_name',
      COALESCE((service_item->>'sort_order')::INTEGER, 0)
    );
  END LOOP;

  -- Sync calculated fields
  PERFORM sync_booking_calculated_fields(booking_id);

  RETURN booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to automatically sync calculated fields when booking_services change
CREATE OR REPLACE FUNCTION trigger_sync_booking_calculated_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_booking_calculated_fields(OLD.booking_id);
    RETURN OLD;
  ELSE
    PERFORM sync_booking_calculated_fields(NEW.booking_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_booking_on_services_change
  AFTER INSERT OR UPDATE OR DELETE ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_booking_calculated_fields();

-- ============================================
-- VIEWS
-- ============================================

-- View for booking with services summary
CREATE OR REPLACE VIEW bookings_with_services AS
SELECT
  b.*,
  COALESCE(bs_summary.service_count, 0) as service_count,
  bs_summary.service_names,
  bs_summary.recipient_names
FROM bookings b
LEFT JOIN (
  SELECT
    booking_id,
    COUNT(*) as service_count,
    STRING_AGG(DISTINCT s.name_th, ', ' ORDER BY s.name_th) as service_names,
    STRING_AGG(DISTINCT bs.recipient_name, ', ') FILTER (WHERE bs.recipient_name IS NOT NULL) as recipient_names
  FROM booking_services bs
  JOIN services s ON s.id = bs.service_id
  GROUP BY booking_id
) bs_summary ON bs_summary.booking_id = b.id;

-- ============================================
-- GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION sync_booking_calculated_fields TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_with_services TO authenticated;
GRANT SELECT ON bookings_with_services TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN bookings.is_multi_service IS 'True if booking has multiple services or recipients';
COMMENT ON COLUMN bookings.service_format IS 'Format for multi-service: single, simultaneous, or sequential';
COMMENT ON COLUMN bookings.recipient_count IS 'Number of recipients for this booking (1-10)';
COMMENT ON COLUMN bookings.total_calculated_duration IS 'Auto-calculated total duration based on services and format';
COMMENT ON COLUMN bookings.services_total_price IS 'Auto-calculated sum of all service prices';

COMMENT ON FUNCTION sync_booking_calculated_fields IS 'Recalculate duration and price fields based on booking_services';
COMMENT ON FUNCTION create_booking_with_services IS 'Create booking with associated services in a single transaction';
COMMENT ON VIEW bookings_with_services IS 'Booking records with service count and names summary';