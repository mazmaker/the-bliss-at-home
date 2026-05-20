-- Migration: Fix Booking Workflow Timing
-- Date: 2026-05-20
-- Description: Separate travel time from service time for accurate billing

-- Add new timing columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_arrival TIMESTAMP WITH TIME ZONE;

-- Create enhanced booking status enum
CREATE TYPE booking_status_v2 AS ENUM (
    'PENDING',
    'PAYMENT_REQUIRED',
    'CONFIRMED',
    'STAFF_MATCHING',
    'ASSIGNED',
    'STAFF_PREPARING',
    'STAFF_EN_ROUTE',
    'STAFF_NEARBY',
    'STAFF_ARRIVED',
    'SERVICE_STARTING',
    'SERVICE_IN_PROGRESS',
    'SERVICE_PAUSED',
    'SERVICE_COMPLETED',
    'PAYMENT_PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'NO_STAFF_AVAILABLE'
);

-- Add new status column (keeping old one for compatibility)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_v2 booking_status_v2 DEFAULT 'PENDING';

-- Create state transition audit table
CREATE TABLE IF NOT EXISTS booking_state_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_state booking_status_v2,
    to_state booking_status_v2 NOT NULL,
    triggered_by UUID REFERENCES profiles(id),
    trigger_source TEXT NOT NULL DEFAULT 'SYSTEM', -- 'STAFF_APP', 'CUSTOMER_APP', 'ADMIN', 'SYSTEM'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Ensure sequential transitions
    CONSTRAINT valid_transition CHECK (from_state IS NULL OR from_state != to_state)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_transitions_booking_id ON booking_state_transitions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_transitions_created_at ON booking_state_transitions(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status_v2 ON bookings(status_v2);
CREATE INDEX IF NOT EXISTS idx_bookings_travel_started_at ON bookings(travel_started_at);
CREATE INDEX IF NOT EXISTS idx_bookings_service_started_at ON bookings(service_started_at);

-- Enhanced staff journey table
ALTER TABLE staff_journeys ADD COLUMN IF NOT EXISTS gps_accuracy_meters DECIMAL(8,2);
ALTER TABLE staff_journeys ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE staff_journeys ADD COLUMN IF NOT EXISTS network_quality TEXT;
ALTER TABLE staff_journeys ADD COLUMN IF NOT EXISTS offline_duration_minutes INTEGER DEFAULT 0;
ALTER TABLE staff_journeys ADD COLUMN IF NOT EXISTS proximity_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_journeys ADD COLUMN IF NOT EXISTS arrival_photo_url TEXT;

-- Journey events for debugging
CREATE TABLE IF NOT EXISTS journey_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES staff_journeys(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'GPS_LOST', 'NETWORK_LOST', 'BATTERY_LOW', 'ACCURACY_POOR', 'PROXIMITY_FAILED'
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journey_events_journey_id ON journey_events(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_created_at ON journey_events(created_at);

-- RLS policies for new tables
ALTER TABLE booking_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read state transitions
CREATE POLICY booking_state_transitions_read ON booking_state_transitions
    FOR SELECT TO authenticated
    USING (true);

-- Allow system to insert state transitions
CREATE POLICY booking_state_transitions_insert ON booking_state_transitions
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to read journey events
CREATE POLICY journey_events_read ON journey_events
    FOR SELECT TO authenticated
    USING (true);

-- Allow system to insert journey events
CREATE POLICY journey_events_insert ON journey_events
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Initialize status_v2 from existing status for backward compatibility
UPDATE bookings
SET status_v2 = CASE
    WHEN status = 'pending' THEN 'PENDING'
    WHEN status = 'confirmed' THEN 'CONFIRMED'
    WHEN status = 'assigned' THEN 'ASSIGNED'
    WHEN status = 'traveling' THEN 'STAFF_EN_ROUTE'
    WHEN status = 'in_progress' THEN 'SERVICE_IN_PROGRESS'
    WHEN status = 'completed' THEN 'COMPLETED'
    WHEN status = 'cancelled' THEN 'CANCELLED'
    ELSE 'PENDING'
END
WHERE status_v2 IS NULL;