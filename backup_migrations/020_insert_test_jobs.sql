-- Insert Test Jobs for Staff App Testing
-- Run this in Supabase SQL Editor

-- First, let's get some IDs we need
DO $$
DECLARE
    v_customer_id UUID;
    v_staff_id UUID;
BEGIN
    -- Get a customer ID (create one if doesn't exist)
    SELECT id INTO v_customer_id FROM profiles WHERE role = 'CUSTOMER' LIMIT 1;

    IF v_customer_id IS NULL THEN
        -- Create a test customer
        INSERT INTO profiles (email, role, full_name, phone, status)
        VALUES ('customer.test@theblissathome.com', 'CUSTOMER', 'ทดสอบ ลูกค้า', '0812345678', 'ACTIVE')
        RETURNING id INTO v_customer_id;
    END IF;

    -- Get a staff ID (the one we're testing with)
    SELECT id INTO v_staff_id FROM profiles WHERE role = 'STAFF' LIMIT 1;

    -- Insert test jobs
    INSERT INTO jobs (
        customer_id,
        staff_id,
        customer_name,
        customer_phone,
        service_name,
        service_name_en,
        duration_minutes,
        scheduled_date,
        scheduled_time,
        address,
        latitude,
        longitude,
        distance_km,
        amount,
        staff_earnings,
        status,
        hotel_name,
        room_number
    ) VALUES
    -- Job 1: Pending job (waiting to be assigned)
    (
        v_customer_id,
        NULL,  -- Not assigned yet
        'คุณสมชาย รักสุขสันต์',
        '0812345678',
        'นวดแผนไทย 2 ชั่วโมง',
        'Thai Massage 2 hours',
        120,
        CURRENT_DATE,
        '14:00:00',
        'โรงแรม Grande Centre Point Terminal 21',
        13.7379871,
        100.5602076,
        5.2,
        1200.00,
        840.00,
        'pending',
        'Grande Centre Point Terminal 21',
        '1502'
    ),
    -- Job 2: Pending job
    (
        v_customer_id,
        NULL,
        'Ms. Sarah Johnson',
        '0898765432',
        'นวดน้ำมันอโรม่า 1.5 ชั่วโมง',
        'Aromatherapy Oil Massage 1.5 hours',
        90,
        CURRENT_DATE,
        '16:30:00',
        'โรงแรม SO/ Bangkok',
        13.7202411,
        100.5279842,
        3.8,
        1500.00,
        1050.00,
        'pending',
        'SO/ Bangkok',
        '2108'
    ),
    -- Job 3: Pending job
    (
        v_customer_id,
        NULL,
        'คุณวิภา เจริญสุข',
        '0823456789',
        'นวดเท้า 1 ชั่วโมง',
        'Foot Massage 1 hour',
        60,
        CURRENT_DATE,
        '18:00:00',
        'โรงแรม Marriott Marquis Queen\'s Park',
        13.7331794,
        100.5592875,
        4.5,
        800.00,
        560.00,
        'pending',
        'Marriott Marquis Queen\'s Park',
        '3205'
    ),
    -- Job 4: Confirmed job (assigned to staff, not started yet)
    (
        v_customer_id,
        v_staff_id,
        'Mr. David Wilson',
        '0845678901',
        'นวดหินร้อน 2 ชั่วโมง',
        'Hot Stone Massage 2 hours',
        120,
        CURRENT_DATE,
        '20:00:00',
        'โรงแรม Anantara Siam Bangkok',
        13.7447435,
        100.5479538,
        2.1,
        2000.00,
        1400.00,
        'confirmed',
        'Anantara Siam Bangkok',
        '508'
    ),
    -- Job 5: Completed job (for today's stats)
    (
        v_customer_id,
        v_staff_id,
        'คุณนันทิดา สว่างใจ',
        '0856789012',
        'นวดแผนไทย 1 ชั่วโมง',
        'Thai Massage 1 hour',
        60,
        CURRENT_DATE,
        '10:00:00',
        'โรงแรม Mandarin Oriental Bangkok',
        13.7230926,
        100.5159042,
        6.3,
        900.00,
        630.00,
        'completed',
        'Mandarin Oriental Bangkok',
        '412'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Update timestamps for completed job
    UPDATE jobs
    SET
        accepted_at = NOW() - INTERVAL '4 hours',
        started_at = NOW() - INTERVAL '3 hours 30 minutes',
        completed_at = NOW() - INTERVAL '2 hours 30 minutes'
    WHERE status = 'completed'
    AND scheduled_date = CURRENT_DATE;

    RAISE NOTICE 'Test jobs inserted successfully!';
END $$;

-- Verify the data
SELECT
    service_name,
    customer_name,
    status,
    scheduled_time,
    staff_earnings,
    hotel_name,
    room_number
FROM jobs
WHERE scheduled_date = CURRENT_DATE
ORDER BY scheduled_time;
