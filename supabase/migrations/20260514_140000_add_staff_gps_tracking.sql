-- Migration: Add GPS tracking for staff journeys
-- Date: 2026-05-14
-- Description: Create tables for real-time staff location tracking

-- Create staff_journeys table for tracking staff travel to bookings
CREATE TABLE staff_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'traveling' CHECK (status IN ('traveling', 'arrived', 'completed', 'cancelled')),
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_location_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure one active journey per booking
  UNIQUE(booking_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create journey_location_updates table for GPS breadcrumbs
CREATE TABLE journey_location_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES staff_journeys(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2), -- GPS accuracy in meters
  altitude DECIMAL(8, 2), -- Optional altitude
  speed DECIMAL(6, 2), -- Optional speed in km/h
  heading DECIMAL(6, 2), -- Optional direction in degrees
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Index for efficient location queries
  CONSTRAINT valid_coordinates CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  )
);

-- Add indexes for performance
CREATE INDEX idx_staff_journeys_booking_id ON staff_journeys(booking_id);
CREATE INDEX idx_staff_journeys_staff_id ON staff_journeys(staff_id);
CREATE INDEX idx_staff_journeys_status ON staff_journeys(status);
CREATE INDEX idx_staff_journeys_updated_at ON staff_journeys(updated_at);

CREATE INDEX idx_journey_location_updates_journey_id ON journey_location_updates(journey_id);
CREATE INDEX idx_journey_location_updates_recorded_at ON journey_location_updates(recorded_at);

-- Add trigger to update staff_journeys.updated_at
CREATE OR REPLACE FUNCTION update_staff_journey_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_staff_journeys_updated_at
  BEFORE UPDATE ON staff_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_journey_timestamp();

-- RLS policies for security
ALTER TABLE staff_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_location_updates ENABLE ROW LEVEL SECURITY;

-- Staff can only see/modify their own journeys
CREATE POLICY staff_journeys_staff_policy ON staff_journeys
  FOR ALL TO authenticated
  USING (
    staff_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'STAFF'
    )
  );

-- Customers can view journeys for their bookings
CREATE POLICY staff_journeys_customer_policy ON staff_journeys
  FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      WHERE b.customer_id = auth.uid()
    )
  );

-- Admin can see all journeys
CREATE POLICY staff_journeys_admin_policy ON staff_journeys
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Location updates follow journey permissions
CREATE POLICY journey_location_updates_policy ON journey_location_updates
  FOR ALL TO authenticated
  USING (
    journey_id IN (
      SELECT id FROM staff_journeys
      -- Inherits permissions from staff_journeys table
    )
  );

-- Create helper function to start a journey
CREATE OR REPLACE FUNCTION start_staff_journey(
  p_booking_id UUID,
  p_staff_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_journey_id UUID;
  v_booking_exists BOOLEAN;
BEGIN
  -- Verify booking exists and is assigned to this staff
  SELECT EXISTS(
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
    AND staff_id = p_staff_id
    AND status IN ('confirmed', 'assigned')
  ) INTO v_booking_exists;

  IF NOT v_booking_exists THEN
    -- Better error message with details
    DECLARE
      v_booking_status TEXT;
      v_assigned_staff_id UUID;
    BEGIN
      SELECT status, staff_id INTO v_booking_status, v_assigned_staff_id
      FROM bookings WHERE id = p_booking_id;

      IF v_booking_status IS NULL THEN
        RAISE EXCEPTION 'ไม่พบงานนี้ในระบบ';
      ELSIF v_assigned_staff_id IS NULL THEN
        RAISE EXCEPTION 'งานยังไม่ได้มอบหมายให้พนักงาน';
      ELSIF v_assigned_staff_id != p_staff_id THEN
        RAISE EXCEPTION 'งานนี้ไม่ได้มอบหมายให้คุณ';
      ELSE
        RAISE EXCEPTION 'สถานะงานไม่เหมาะสม (%) กรุณารอการยืนยัน', v_booking_status;
      END IF;
    END;
  END IF;

  -- Create journey record
  INSERT INTO staff_journeys (booking_id, staff_id, status)
  VALUES (p_booking_id, p_staff_id, 'traveling')
  RETURNING id INTO v_journey_id;

  -- Update booking status
  UPDATE bookings
  SET status = 'traveling', started_at = now()
  WHERE id = p_booking_id;

  RETURN v_journey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to update location
CREATE OR REPLACE FUNCTION update_journey_location(
  p_journey_id UUID,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_accuracy DECIMAL(6, 2) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update current location in journey
  UPDATE staff_journeys
  SET
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    last_location_update = now()
  WHERE id = p_journey_id;

  -- Add to location history
  INSERT INTO journey_location_updates (
    journey_id, latitude, longitude, accuracy
  ) VALUES (
    p_journey_id, p_latitude, p_longitude, p_accuracy
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to complete journey
CREATE OR REPLACE FUNCTION complete_staff_journey(
  p_journey_id UUID,
  p_final_latitude DECIMAL(10, 8),
  p_final_longitude DECIMAL(11, 8)
)
RETURNS VOID AS $$
BEGIN
  -- Update journey status
  UPDATE staff_journeys
  SET
    status = 'arrived',
    current_latitude = p_final_latitude,
    current_longitude = p_final_longitude,
    arrived_at = now(),
    last_location_update = now()
  WHERE id = p_journey_id;

  -- Add final location
  INSERT INTO journey_location_updates (
    journey_id, latitude, longitude
  ) VALUES (
    p_journey_id, p_final_latitude, p_final_longitude
  );

  -- Update booking status
  UPDATE bookings
  SET status = 'in_progress'
  WHERE id = (
    SELECT booking_id FROM staff_journeys WHERE id = p_journey_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;