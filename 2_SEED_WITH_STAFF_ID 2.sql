-- ============================================
-- ขั้นตอนที่ 2: เพิ่มข้อมูล Mockup
-- ============================================
-- แทนที่ 'YOUR_STAFF_ID_HERE' ด้านล่างด้วย Staff ID ที่ได้จากขั้นตอนที่ 1
-- ============================================

DO $$
DECLARE
    v_customer_id UUID;
    v_staff_id UUID := 'f7dff1db-ca35-406f-a119-249363063a41'::UUID; -- ⬅️ ใส่ Staff ID ของคุณที่นี่
BEGIN
    RAISE NOTICE 'Using Staff ID: %', v_staff_id;

    -- หาหรือสร้าง Customer ทดสอบ
    SELECT id INTO v_customer_id FROM profiles WHERE email = 'customer.mockup@theblissathome.com';

    IF v_customer_id IS NULL THEN
        INSERT INTO profiles (email, role, full_name, phone, status)
        VALUES ('customer.mockup@theblissathome.com', 'CUSTOMER', 'ลูกค้าทดสอบ Mockup', '0812345678', 'ACTIVE')
        RETURNING id INTO v_customer_id;
        RAISE NOTICE 'สร้าง Customer ทดสอบแล้ว';
    END IF;

    -- ลบงานทดสอบเก่าของ Staff คนนี้
    DELETE FROM jobs WHERE staff_id = v_staff_id AND customer_id = v_customer_id;
    DELETE FROM jobs WHERE customer_id = v_customer_id AND status = 'pending';
    RAISE NOTICE 'ลบงานเก่าแล้ว';

    -- ============================================
    -- เพิ่มงาน Pending (รอมอบหมาย) - 3 งาน
    -- ============================================
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
        v_customer_id, NULL,
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
    );

    RAISE NOTICE 'เพิ่มงาน Pending: 3 งาน';

    -- ============================================
    -- เพิ่มงาน Assigned/Confirmed (กำลังจะมาถึง) - 3 งาน
    -- ============================================
    INSERT INTO jobs (
        customer_id, staff_id, customer_name, customer_phone,
        service_name, service_name_en, duration_minutes,
        scheduled_date, scheduled_time,
        address, latitude, longitude, distance_km,
        amount, staff_earnings, status,
        hotel_name, room_number, accepted_at
    ) VALUES
    (
        v_customer_id, v_staff_id,
        'Mr. David Wilson', '0845678901',
        'นวดหินร้อน 2 ชั่วโมง', 'Hot Stone Massage 2 hours', 120,
        CURRENT_DATE, '20:00:00',
        'โรงแรม Anantara Siam Bangkok', 13.7447435, 100.5479538, 2.1,
        2000.00, 1400.00, 'assigned',
        'Anantara Siam Bangkok', '508', NOW() - INTERVAL '2 hours'
    ),
    (
        v_customer_id, v_staff_id,
        'คุณประภา สุขสันต์', '0834567890',
        'นวดไทยผสมน้ำมัน 2 ชั่วโมง', 'Thai Oil Combo Massage 2 hours', 120,
        CURRENT_DATE + INTERVAL '1 day', '10:00:00',
        'โรงแลม The Peninsula Bangkok', 13.7210588, 100.5106964, 7.2,
        1800.00, 1260.00, 'confirmed',
        'The Peninsula Bangkok', '705', NOW() - INTERVAL '1 hour'
    ),
    (
        v_customer_id, v_staff_id,
        'Ms. Emily Chen', '0867890123',
        'นวดสปอร์ต 1.5 ชั่วโมง', 'Sports Massage 1.5 hours', 90,
        CURRENT_DATE + INTERVAL '1 day', '14:00:00',
        'โรงแรม Waldorf Astoria Bangkok', 13.7317851, 100.5420166, 3.5,
        1600.00, 1120.00, 'confirmed',
        'Waldorf Astoria Bangkok', '1203', NOW() - INTERVAL '3 hours'
    );

    RAISE NOTICE 'เพิ่มงาน Assigned/Confirmed: 3 งาน';

    -- ============================================
    -- เพิ่มงาน Completed (เสร็จสิ้นแล้ว) - 5 งาน
    -- ============================================
    INSERT INTO jobs (
        customer_id, staff_id, customer_name, customer_phone,
        service_name, service_name_en, duration_minutes,
        scheduled_date, scheduled_time,
        address, latitude, longitude, distance_km,
        amount, staff_earnings, tip_amount, status,
        hotel_name, room_number,
        accepted_at, started_at, completed_at
    ) VALUES
    -- งานวันนี้ที่เสร็จแล้ว
    (
        v_customer_id, v_staff_id,
        'คุณนันทิดา สว่างใจ', '0856789012',
        'นวดแผนไทย 1 ชั่วโมง', 'Thai Massage 1 hour', 60,
        CURRENT_DATE, '10:00:00',
        'โรงแรม Mandarin Oriental Bangkok', 13.7230926, 100.5159042, 6.3,
        900.00, 630.00, 50.00, 'completed',
        'Mandarin Oriental Bangkok', '412',
        NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours'
    ),
    (
        v_customer_id, v_staff_id,
        'Mr. James Anderson', '0878901234',
        'นวดน้ำมันหอมระเหย 1 ชั่วโมง', 'Aromatherapy Massage 1 hour', 60,
        CURRENT_DATE, '08:00:00',
        'โรงแรม Four Seasons Bangkok', 13.7234586, 100.5403421, 4.8,
        1100.00, 770.00, 100.00, 'completed',
        'Four Seasons Bangkok', '308',
        NOW() - INTERVAL '7 hours', NOW() - INTERVAL '6 hours 30 minutes', NOW() - INTERVAL '5 hours 30 minutes'
    ),
    -- งานเมื่อวาน
    (
        v_customer_id, v_staff_id,
        'คุณสุภาพร แสงสว่าง', '0889012345',
        'นวดฝ่าเท้า 45 นาที', 'Foot Reflexology 45 min', 45,
        CURRENT_DATE - INTERVAL '1 day', '19:00:00',
        'โรงแรม Shangri-La Bangkok', 13.7209483, 100.5161822, 5.9,
        650.00, 455.00, 45.00, 'completed',
        'Shangri-La Bangkok', '1508',
        NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day 1 hour 30 minutes', NOW() - INTERVAL '1 day 45 minutes'
    ),
    (
        v_customer_id, v_staff_id,
        'คุณอรพรรณ มีสุข', '0890123456',
        'นวดแผนไทย 2 ชั่วโมง', 'Thai Massage 2 hours', 120,
        CURRENT_DATE - INTERVAL '1 day', '16:00:00',
        'โรงแรม The Siam', 13.7611111, 100.5161111, 8.1,
        1200.00, 840.00, 0.00, 'completed',
        'The Siam', '203',
        NOW() - INTERVAL '1 day 5 hours', NOW() - INTERVAL '1 day 4 hours', NOW() - INTERVAL '1 day 2 hours'
    ),
    -- งาน 2 วันก่อน
    (
        v_customer_id, v_staff_id,
        'Mr. Michael Brown', '0801234567',
        'นวดบำบัด 1.5 ชั่วโมง', 'Therapeutic Massage 1.5 hours', 90,
        CURRENT_DATE - INTERVAL '2 days', '15:00:00',
        'โรงแรม St Regis Bangkok', 13.7447435, 100.5479538, 3.2,
        1400.00, 980.00, 70.00, 'completed',
        'St Regis Bangkok', '1105',
        NOW() - INTERVAL '2 days 6 hours', NOW() - INTERVAL '2 days 5 hours', NOW() - INTERVAL '2 days 3 hours 30 minutes'
    );

    RAISE NOTICE 'เพิ่มงาน Completed: 5 งาน';

    -- แสดงสรุป
    RAISE NOTICE '============================================';
    RAISE NOTICE 'สร้างข้อมูล Mockup เรียบร้อยแล้ว!';
    RAISE NOTICE 'Staff ID: %', v_staff_id;
    RAISE NOTICE 'รวม: % งาน', (SELECT COUNT(*) FROM jobs WHERE staff_id = v_staff_id OR (customer_id = v_customer_id AND status = 'pending'));
    RAISE NOTICE '- Pending: % งาน', (SELECT COUNT(*) FROM jobs WHERE customer_id = v_customer_id AND status = 'pending');
    RAISE NOTICE '- Assigned/Confirmed: % งาน', (SELECT COUNT(*) FROM jobs WHERE staff_id = v_staff_id AND status IN ('assigned', 'confirmed'));
    RAISE NOTICE '- Completed: % งาน', (SELECT COUNT(*) FROM jobs WHERE staff_id = v_staff_id AND status = 'completed');
    RAISE NOTICE '============================================';

END $$;

-- แสดงผลลัพธ์
SELECT
    status,
    COUNT(*) as จำนวน,
    ROUND(SUM(staff_earnings), 2) as รายได้รวม
FROM jobs
WHERE staff_id = 'f7dff1db-ca35-406f-a119-249363063a41'::UUID  -- ⬅️ ใส่ Staff ID เดียวกันที่นี่
GROUP BY status
ORDER BY
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'assigned' THEN 2
        WHEN 'confirmed' THEN 3
        WHEN 'completed' THEN 4
        ELSE 5
    END;
