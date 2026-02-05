-- Insert More Mockup Jobs for Staff App Testing
-- This script creates a variety of job statuses for testing the dashboard

DO $$
DECLARE
    v_customer_id UUID;
    v_staff_id UUID;
    v_customer_id_2 UUID;
BEGIN
    -- Get or create test customers
    SELECT id INTO v_customer_id FROM profiles WHERE email = 'customer.test@theblissathome.com';

    IF v_customer_id IS NULL THEN
        INSERT INTO profiles (email, role, full_name, phone, status)
        VALUES ('customer.test@theblissathome.com', 'CUSTOMER', 'ทดสอบ ลูกค้า', '0812345678', 'ACTIVE')
        RETURNING id INTO v_customer_id;
    END IF;

    -- Create second customer
    SELECT id INTO v_customer_id_2 FROM profiles WHERE email = 'customer2.test@theblissathome.com';

    IF v_customer_id_2 IS NULL THEN
        INSERT INTO profiles (email, role, full_name, phone, status)
        VALUES ('customer2.test@theblissathome.com', 'CUSTOMER', 'คุณสมหญิง สวยงาม', '0887654321', 'ACTIVE')
        RETURNING id INTO v_customer_id_2;
    END IF;

    -- Get staff ID (the logged-in staff)
    SELECT id INTO v_staff_id FROM profiles WHERE role = 'STAFF' LIMIT 1;

    -- Delete old test jobs to avoid duplicates
    DELETE FROM jobs WHERE customer_id IN (v_customer_id, v_customer_id_2);

    -- ========================================
    -- Insert Pending Jobs (รอมอบหมาย)
    -- ========================================
    INSERT INTO jobs (
        customer_id, staff_id, customer_name, customer_phone,
        service_name, service_name_en, duration_minutes,
        scheduled_date, scheduled_time,
        address, latitude, longitude, distance_km,
        amount, staff_earnings, status,
        hotel_name, room_number
    ) VALUES
    (
        v_customer_id, NULL,
        'คุณสมชาย รักสุขสันต์', '0812345678',
        'นวดแผนไทย 2 ชั่วโมง', 'Thai Massage 2 hours', 120,
        CURRENT_DATE, '14:00:00',
        'โรงแรม Grande Centre Point Terminal 21', 13.7379871, 100.5602076, 5.2,
        1200.00, 840.00, 'pending',
        'Grande Centre Point Terminal 21', '1502'
    ),
    (
        v_customer_id_2, NULL,
        'Ms. Sarah Johnson', '0898765432',
        'นวดน้ำมันอโรม่า 1.5 ชั่วโมง', 'Aromatherapy Oil Massage 1.5 hours', 90,
        CURRENT_DATE, '16:30:00',
        'โรงแรม SO/ Bangkok', 13.7202411, 100.5279842, 3.8,
        1500.00, 1050.00, 'pending',
        'SO/ Bangkok', '2108'
    ),
    (
        v_customer_id, NULL,
        'คุณวิภา เจริญสุข', '0823456789',
        'นวดเท้า 1 ชั่วโมง', 'Foot Massage 1 hour', 60,
        CURRENT_DATE, '18:00:00',
        'โรงแรม Marriott Marquis Queens Park', 13.7331794, 100.5592875, 4.5,
        800.00, 560.00, 'pending',
        'Marriott Marquis Queens Park', '3205'
    ),

    -- ========================================
    -- Insert Confirmed/Assigned Jobs (งานที่กำลังจะมาถึง)
    -- ========================================
    (
        v_customer_id, v_staff_id,
        'Mr. David Wilson', '0845678901',
        'นวดหินร้อน 2 ชั่วโมง', 'Hot Stone Massage 2 hours', 120,
        CURRENT_DATE, '20:00:00',
        'โรงแรม Anantara Siam Bangkok', 13.7447435, 100.5479538, 2.1,
        2000.00, 1400.00, 'confirmed',
        'Anantara Siam Bangkok', '508'
    ),
    (
        v_customer_id_2, v_staff_id,
        'คุณประภา สุขสันต์', '0834567890',
        'นวดไทยผสมน้ำมัน 2 ชั่วโมง', 'Thai Oil Combo Massage 2 hours', 120,
        CURRENT_DATE + INTERVAL '1 day', '10:00:00',
        'โรงแรม The Peninsula Bangkok', 13.7210588, 100.5106964, 7.2,
        1800.00, 1260.00, 'assigned',
        'The Peninsula Bangkok', '705'
    ),
    (
        v_customer_id, v_staff_id,
        'Ms. Emily Chen', '0867890123',
        'นวดสปอร์ต 1.5 ชั่วโมง', 'Sports Massage 1.5 hours', 90,
        CURRENT_DATE + INTERVAL '1 day', '14:00:00',
        'โรงแรม Waldorf Astoria Bangkok', 13.7317851, 100.5420166, 3.5,
        1600.00, 1120.00, 'confirmed',
        'Waldorf Astoria Bangkok', '1203'
    ),

    -- ========================================
    -- Insert Completed Jobs (งานที่เสร็จสิ้นแล้ว)
    -- ========================================
    (
        v_customer_id, v_staff_id,
        'คุณนันทิดา สว่างใจ', '0856789012',
        'นวดแผนไทย 1 ชั่วโมง', 'Thai Massage 1 hour', 60,
        CURRENT_DATE, '10:00:00',
        'โรงแรม Mandarin Oriental Bangkok', 13.7230926, 100.5159042, 6.3,
        900.00, 630.00, 'completed',
        'Mandarin Oriental Bangkok', '412'
    ),
    (
        v_customer_id_2, v_staff_id,
        'Mr. James Anderson', '0878901234',
        'นวดน้ำมันหอมระเหย 1 ชั่วโมง', 'Aromatherapy Massage 1 hour', 60,
        CURRENT_DATE, '08:00:00',
        'โรงแรม Four Seasons Bangkok', 13.7234586, 100.5403421, 4.8,
        1100.00, 770.00, 'completed',
        'Four Seasons Bangkok', '308'
    ),
    (
        v_customer_id, v_staff_id,
        'คุณสุภาพร แสงสว่าง', '0889012345',
        'นวดฝ่าเท้า 45 นาที', 'Foot Reflexology 45 min', 45,
        CURRENT_DATE - INTERVAL '1 day', '19:00:00',
        'โรงแรม Shangri-La Bangkok', 13.7209483, 100.5161822, 5.9,
        650.00, 455.00, 'completed',
        'Shangri-La Bangkok', '1508'
    ),
    (
        v_customer_id_2, v_staff_id,
        'คุณอรพรรณ มีสุข', '0890123456',
        'นวดแผนไทย 2 ชั่วโมง', 'Thai Massage 2 hours', 120,
        CURRENT_DATE - INTERVAL '1 day', '16:00:00',
        'โรงแรม The Siam', 13.7611111, 100.5161111, 8.1,
        1200.00, 840.00, 'completed',
        'The Siam', '203'
    ),
    (
        v_customer_id, v_staff_id,
        'Mr. Michael Brown', '0801234567',
        'นวดบำบัด 1.5 ชั่วโมง', 'Therapeutic Massage 1.5 hours', 90,
        CURRENT_DATE - INTERVAL '2 day', '15:00:00',
        'โรงแรม St Regis Bangkok', 13.7447435, 100.5479538, 3.2,
        1400.00, 980.00, 'completed',
        'St Regis Bangkok', '1105'
    );

    -- Update timestamps for completed jobs
    UPDATE jobs
    SET
        accepted_at = created_at + INTERVAL '5 minutes',
        started_at = created_at + INTERVAL '1 hour',
        completed_at = created_at + INTERVAL '2 hours',
        tip_amount = CASE
            WHEN random() > 0.5 THEN staff_earnings * 0.1
            ELSE 0
        END
    WHERE status = 'completed';

    -- Update timestamps for confirmed jobs
    UPDATE jobs
    SET accepted_at = NOW() - INTERVAL '2 hours'
    WHERE status IN ('confirmed', 'assigned');

    RAISE NOTICE 'Mockup jobs inserted successfully!';
    RAISE NOTICE 'Total jobs created: %', (SELECT COUNT(*) FROM jobs WHERE customer_id IN (v_customer_id, v_customer_id_2));
END $$;

-- Show summary of created jobs
SELECT
    status,
    COUNT(*) as count,
    SUM(staff_earnings) as total_earnings
FROM jobs
WHERE customer_id IN (
    SELECT id FROM profiles WHERE email LIKE '%test@theblissathome.com'
)
GROUP BY status
ORDER BY status;

-- Show today's jobs
SELECT
    service_name,
    customer_name,
    status,
    scheduled_time,
    staff_earnings,
    hotel_name
FROM jobs
WHERE scheduled_date = CURRENT_DATE
ORDER BY scheduled_time;
