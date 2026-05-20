-- Migration: Create Workflow RPC Functions
-- Date: 2026-05-20
-- Description: RPC functions for new booking workflow

-- Helper function: Calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DECIMAL, lng1 DECIMAL,
    lat2 DECIMAL, lng2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    r DECIMAL := 6371000; -- Earth's radius in meters
    d_lat DECIMAL;
    d_lng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    d_lat := radians(lat2 - lat1);
    d_lng := radians(lng2 - lng1);

    a := sin(d_lat/2) * sin(d_lat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(d_lng/2) * sin(d_lng/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN r * c;
END;
$$ LANGUAGE plpgsql;

-- State validation function
CREATE OR REPLACE FUNCTION is_valid_state_transition(
    p_from_state booking_status_v2,
    p_to_state booking_status_v2
)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid_transitions TEXT[];
BEGIN
    -- Define valid transitions for each state
    CASE p_from_state
        WHEN 'PENDING' THEN
            v_valid_transitions := ARRAY['PAYMENT_REQUIRED', 'CONFIRMED', 'CANCELLED'];
        WHEN 'PAYMENT_REQUIRED' THEN
            v_valid_transitions := ARRAY['CONFIRMED', 'CANCELLED'];
        WHEN 'CONFIRMED' THEN
            v_valid_transitions := ARRAY['STAFF_MATCHING', 'CANCELLED'];
        WHEN 'STAFF_MATCHING' THEN
            v_valid_transitions := ARRAY['ASSIGNED', 'NO_STAFF_AVAILABLE', 'CANCELLED'];
        WHEN 'ASSIGNED' THEN
            v_valid_transitions := ARRAY['STAFF_PREPARING', 'STAFF_EN_ROUTE', 'CANCELLED'];
        WHEN 'STAFF_PREPARING' THEN
            v_valid_transitions := ARRAY['STAFF_EN_ROUTE', 'CANCELLED'];
        WHEN 'STAFF_EN_ROUTE' THEN
            v_valid_transitions := ARRAY['STAFF_NEARBY', 'STAFF_ARRIVED', 'CANCELLED'];
        WHEN 'STAFF_NEARBY' THEN
            v_valid_transitions := ARRAY['STAFF_ARRIVED', 'STAFF_EN_ROUTE', 'CANCELLED'];
        WHEN 'STAFF_ARRIVED' THEN
            v_valid_transitions := ARRAY['SERVICE_STARTING', 'SERVICE_IN_PROGRESS', 'CANCELLED'];
        WHEN 'SERVICE_STARTING' THEN
            v_valid_transitions := ARRAY['SERVICE_IN_PROGRESS', 'CANCELLED'];
        WHEN 'SERVICE_IN_PROGRESS' THEN
            v_valid_transitions := ARRAY['SERVICE_PAUSED', 'SERVICE_COMPLETED', 'CANCELLED'];
        WHEN 'SERVICE_PAUSED' THEN
            v_valid_transitions := ARRAY['SERVICE_IN_PROGRESS', 'CANCELLED'];
        WHEN 'SERVICE_COMPLETED' THEN
            v_valid_transitions := ARRAY['PAYMENT_PROCESSING'];
        WHEN 'PAYMENT_PROCESSING' THEN
            v_valid_transitions := ARRAY['COMPLETED', 'PAYMENT_REQUIRED'];
        WHEN 'NO_STAFF_AVAILABLE' THEN
            v_valid_transitions := ARRAY['STAFF_MATCHING', 'CANCELLED'];
        ELSE
            v_valid_transitions := ARRAY[]::TEXT[];
    END CASE;

    RETURN p_to_state::TEXT = ANY(v_valid_transitions);
END;
$$ LANGUAGE plpgsql;

-- Main state machine controller
CREATE OR REPLACE FUNCTION transition_booking_state(
    p_booking_id UUID,
    p_to_state booking_status_v2,
    p_triggered_by UUID DEFAULT NULL,
    p_trigger_source TEXT DEFAULT 'SYSTEM',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS booking_state_transitions AS $$
DECLARE
    v_current_state booking_status_v2;
    v_transition_record booking_state_transitions;
    v_valid_transition BOOLEAN;
BEGIN
    -- Get current state
    SELECT status_v2 INTO v_current_state
    FROM bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    -- Validate transition
    SELECT is_valid_state_transition(v_current_state, p_to_state) INTO v_valid_transition;

    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'Invalid state transition from % to %', v_current_state, p_to_state;
    END IF;

    -- Update booking state with appropriate timestamps
    UPDATE bookings
    SET
        status_v2 = p_to_state,
        updated_at = now(),
        -- Set travel_started_at when staff starts traveling
        travel_started_at = CASE
            WHEN p_to_state = 'STAFF_EN_ROUTE' AND travel_started_at IS NULL THEN now()
            ELSE travel_started_at
        END,
        -- Set service_started_at when service actually starts (not during travel!)
        service_started_at = CASE
            WHEN p_to_state = 'SERVICE_IN_PROGRESS' AND service_started_at IS NULL THEN now()
            ELSE service_started_at
        END,
        -- Set actual_arrival when staff arrives
        actual_arrival = CASE
            WHEN p_to_state = 'STAFF_ARRIVED' AND actual_arrival IS NULL THEN now()
            ELSE actual_arrival
        END,
        -- Set completed_at when service completes
        completed_at = CASE
            WHEN p_to_state = 'COMPLETED' AND completed_at IS NULL THEN now()
            ELSE completed_at
        END,
        -- IMPORTANT: Only set started_at for billing when service actually starts
        started_at = CASE
            WHEN p_to_state = 'SERVICE_IN_PROGRESS' AND started_at IS NULL THEN now()
            ELSE started_at
        END
    WHERE id = p_booking_id;

    -- Log transition for audit
    INSERT INTO booking_state_transitions (
        booking_id, from_state, to_state, triggered_by, trigger_source, metadata
    ) VALUES (
        p_booking_id, v_current_state, p_to_state, p_triggered_by, p_trigger_source, p_metadata
    ) RETURNING * INTO v_transition_record;

    -- Update legacy status for backward compatibility
    UPDATE bookings
    SET status = CASE p_to_state
        WHEN 'PENDING' THEN 'pending'
        WHEN 'CONFIRMED' THEN 'confirmed'
        WHEN 'ASSIGNED' THEN 'assigned'
        WHEN 'STAFF_EN_ROUTE' THEN 'traveling'
        WHEN 'STAFF_ARRIVED' THEN 'traveling'
        WHEN 'SERVICE_IN_PROGRESS' THEN 'in_progress'
        WHEN 'COMPLETED' THEN 'completed'
        WHEN 'CANCELLED' THEN 'cancelled'
        ELSE status
    END
    WHERE id = p_booking_id;

    RETURN v_transition_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Start GPS journey only (no billing timer)
CREATE OR REPLACE FUNCTION start_gps_journey_only(
    p_booking_id UUID,
    p_staff_id UUID,
    p_initial_location JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_journey_id UUID;
    v_booking_status booking_status_v2;
    v_staff_profile_id UUID;
BEGIN
    -- Get staff profile ID
    SELECT profile_id INTO v_staff_profile_id
    FROM staff
    WHERE id = p_staff_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff not found: %', p_staff_id;
    END IF;

    -- Verify booking state and ownership
    SELECT status_v2 INTO v_booking_status
    FROM bookings
    WHERE id = p_booking_id AND staff_id = v_staff_profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or not assigned to this staff: %', p_booking_id;
    END IF;

    IF v_booking_status NOT IN ('ASSIGNED', 'STAFF_PREPARING') THEN
        RAISE EXCEPTION 'Cannot start journey from state: %', v_booking_status;
    END IF;

    -- Create journey record
    INSERT INTO staff_journeys (
        booking_id,
        staff_id,
        status,
        current_latitude,
        current_longitude,
        gps_accuracy_meters,
        battery_level
    ) VALUES (
        p_booking_id,
        v_staff_profile_id,  -- Use profile_id for journey
        'traveling',
        (p_initial_location->>'latitude')::DECIMAL,
        (p_initial_location->>'longitude')::DECIMAL,
        (p_initial_location->>'accuracy')::DECIMAL,
        (p_initial_location->>'batteryLevel')::INTEGER
    ) RETURNING id INTO v_journey_id;

    -- Transition to STAFF_EN_ROUTE (this sets travel_started_at, NOT billing timer)
    PERFORM transition_booking_state(
        p_booking_id,
        'STAFF_EN_ROUTE',
        v_staff_profile_id,
        'STAFF_APP',
        jsonb_build_object(
            'journey_id', v_journey_id,
            'initial_location', p_initial_location
        )
    );

    RETURN v_journey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Confirm staff arrival with proximity verification
CREATE OR REPLACE FUNCTION confirm_staff_arrival(
    p_booking_id UUID,
    p_location JSONB,
    p_photo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_booking_lat DECIMAL;
    v_booking_lng DECIMAL;
    v_staff_lat DECIMAL;
    v_staff_lng DECIMAL;
    v_distance_meters DECIMAL;
    v_is_nearby BOOLEAN := FALSE;
    v_journey_id UUID;
BEGIN
    -- Get booking location
    SELECT latitude, longitude INTO v_booking_lat, v_booking_lng
    FROM bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    -- Get journey ID
    SELECT id INTO v_journey_id
    FROM staff_journeys
    WHERE booking_id = p_booking_id
    AND status = 'traveling'
    ORDER BY started_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active journey found for booking: %', p_booking_id;
    END IF;

    -- Extract staff location
    v_staff_lat := (p_location->>'latitude')::DECIMAL;
    v_staff_lng := (p_location->>'longitude')::DECIMAL;

    -- Calculate distance
    v_distance_meters := calculate_distance_meters(
        v_booking_lat, v_booking_lng,
        v_staff_lat, v_staff_lng
    );

    -- Check if within 100m (configurable threshold)
    v_is_nearby := v_distance_meters <= 100;

    IF v_is_nearby THEN
        -- Update journey status
        UPDATE staff_journeys
        SET
            status = 'arrived',
            current_latitude = v_staff_lat,
            current_longitude = v_staff_lng,
            arrived_at = now(),
            proximity_verified = TRUE,
            arrival_photo_url = p_photo_url
        WHERE id = v_journey_id;

        -- Transition booking to STAFF_ARRIVED
        PERFORM transition_booking_state(
            p_booking_id,
            'STAFF_ARRIVED',
            NULL,
            'SYSTEM',
            jsonb_build_object(
                'distance_meters', v_distance_meters,
                'verified_location', p_location,
                'journey_id', v_journey_id
            )
        );
    ELSE
        -- Log proximity failure
        INSERT INTO journey_events (journey_id, event_type, event_data)
        VALUES (v_journey_id, 'PROXIMITY_FAILED', jsonb_build_object(
            'distance_meters', v_distance_meters,
            'required_meters', 100,
            'staff_location', p_location
        ));

        RAISE EXCEPTION 'Staff must be within 100m of booking location. Current distance: % meters', v_distance_meters;
    END IF;

    RETURN v_is_nearby;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Start service billing (THIS is where billing timer starts)
CREATE OR REPLACE FUNCTION start_service_billing(
    p_booking_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_service_rate DECIMAL;
    v_travel_duration DECIMAL;
    v_travel_compensation DECIMAL := 0;
BEGIN
    -- Get booking details
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    -- Validate state
    IF v_booking.status_v2 != 'STAFF_ARRIVED' THEN
        RAISE EXCEPTION 'Cannot start service from state: %', v_booking.status_v2;
    END IF;

    -- Calculate travel duration for compensation (optional)
    IF v_booking.travel_started_at IS NOT NULL AND v_booking.actual_arrival IS NOT NULL THEN
        v_travel_duration := EXTRACT(EPOCH FROM (v_booking.actual_arrival - v_booking.travel_started_at)) / 60;
        -- Travel compensation: 5 baht per minute, max 150 baht
        v_travel_compensation := LEAST(v_travel_duration * 5, 150);
    END IF;

    -- Get service rate
    SELECT staff_commission_rate INTO v_service_rate
    FROM services WHERE id = v_booking.service_id;

    v_service_rate := COALESCE(v_service_rate, 30); -- Default 30% if not set

    -- Transition to SERVICE_IN_PROGRESS (THIS sets billing timer)
    PERFORM transition_booking_state(
        p_booking_id,
        'SERVICE_IN_PROGRESS',
        NULL,
        'STAFF_APP',
        jsonb_build_object(
            'travel_duration_minutes', v_travel_duration,
            'travel_compensation', v_travel_compensation,
            'service_rate', v_service_rate
        )
    );

    -- Update jobs table for legacy compatibility
    UPDATE jobs
    SET
        status = 'in_progress',
        started_at = now()
    WHERE booking_id = p_booking_id;

    -- Return billing information
    RETURN jsonb_build_object(
        'service_started_at', now(),
        'travel_duration_minutes', v_travel_duration,
        'travel_compensation', v_travel_compensation,
        'service_rate', v_service_rate,
        'billing_starts_now', TRUE,
        'message', 'เริ่มคิดค่าบริการแล้ว'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;