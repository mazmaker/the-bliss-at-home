-- ============================================
-- เพิ่มงาน Pending 50 งาน
-- ============================================
-- วิธีใช้: คัดลอก SQL นี้ไปวางใน Supabase Studio > SQL Editor และกด RUN
-- ============================================

DO $$
DECLARE
    v_customer_id UUID;
    v_job_count INTEGER := 0;
BEGIN
    -- หา Customer ทดสอบ
    SELECT id INTO v_customer_id FROM profiles WHERE email = 'customer.mockup@theblissathome.com';

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'ไม่พบ Customer ทดสอบ กรุณารันไฟล์ 2_SEED_WITH_STAFF_ID.sql ก่อน';
    END IF;

    RAISE NOTICE 'Adding 50 pending jobs...';

    -- เพิ่มงาน Pending 50 งาน
    INSERT INTO jobs (
        customer_id, staff_id, customer_name, customer_phone,
        service_name, service_name_en, duration_minutes,
        scheduled_date, scheduled_time,
        address, latitude, longitude, distance_km,
        amount, staff_earnings, status,
        hotel_name, room_number
    ) VALUES
    -- งานชุดที่ 1-10
    (v_customer_id, NULL, 'คุณสมศรี มีสุข', '0812345601', 'นวดแผนไทย 1 ชั่วโมง', 'Thai Massage 1 hour', 60, CURRENT_DATE, '09:00:00', 'โรงแรม InterContinental Bangkok', 13.7265, 100.5406, 4.2, 800.00, 560.00, 'pending', 'InterContinental Bangkok', '301'),
    (v_customer_id, NULL, 'Mr. John Smith', '0898765432', 'นวดน้ำมัน 1.5 ชั่วโมง', 'Oil Massage 1.5 hours', 90, CURRENT_DATE, '09:30:00', 'โรงแรม Banyan Tree Bangkok', 13.7238, 100.5408, 3.8, 1400.00, 980.00, 'pending', 'Banyan Tree Bangkok', '1205'),
    (v_customer_id, NULL, 'คุณวิไล สุขใจ', '0823456789', 'นวดเท้า 45 นาที', 'Foot Massage 45 min', 45, CURRENT_DATE, '10:00:00', 'โรงแรม Sofitel Bangkok', 13.7310, 100.5407, 2.9, 600.00, 420.00, 'pending', 'Sofitel Bangkok', '802'),
    (v_customer_id, NULL, 'Ms. Emma Wilson', '0834567890', 'นวดหินร้อน 2 ชั่วโมง', 'Hot Stone Massage 2 hours', 120, CURRENT_DATE, '10:30:00', 'โรงแรม Park Hyatt Bangkok', 13.7441, 100.5482, 2.1, 2200.00, 1540.00, 'pending', 'Park Hyatt Bangkok', '1501'),
    (v_customer_id, NULL, 'คุณประเสริฐ ดีเลิศ', '0845678901', 'นวดสปอร์ต 1 ชั่วโมง', 'Sports Massage 1 hour', 60, CURRENT_DATE, '11:00:00', 'โรงแรม Conrad Bangkok', 13.7278, 100.5414, 3.5, 1100.00, 770.00, 'pending', 'Conrad Bangkok', '602'),
    (v_customer_id, NULL, 'Mr. David Lee', '0856789012', 'นวดไทยผสมน้ำมัน 2 ชั่วโมง', 'Thai Oil Combo 2 hours', 120, CURRENT_DATE, '11:30:00', 'โรงแรม Capella Bangkok', 13.7208, 100.5107, 7.8, 1900.00, 1330.00, 'pending', 'Capella Bangkok', '901'),
    (v_customer_id, NULL, 'คุณสุภาพร แสงจันทร์', '0867890123', 'นวดอโรมา 1.5 ชั่วโมง', 'Aromatherapy 1.5 hours', 90, CURRENT_DATE, '12:00:00', 'โรงแรม Eastin Grand Sathorn', 13.7189, 100.5268, 5.6, 1350.00, 945.00, 'pending', 'Eastin Grand Sathorn', '1108'),
    (v_customer_id, NULL, 'Ms. Sarah Johnson', '0878901234', 'นวดคลายกล้ามเนื้อ 1 ชั่วโมง', 'Deep Tissue 1 hour', 60, CURRENT_DATE, '12:30:00', 'โรงแรม W Bangkok', 13.7240, 100.5430, 4.3, 1250.00, 875.00, 'pending', 'W Bangkok', '705'),
    (v_customer_id, NULL, 'คุณนิรันดร์ ชัยชนะ', '0889012345', 'นวดหน้า 45 นาที', 'Facial Massage 45 min', 45, CURRENT_DATE, '13:00:00', 'โรงแรม Rosewood Bangkok', 13.7418, 100.5465, 2.8, 950.00, 665.00, 'pending', 'Rosewood Bangkok', '1602'),
    (v_customer_id, NULL, 'Mr. Michael Brown', '0890123456', 'นวดบำบัด 2 ชั่วโมง', 'Therapeutic Massage 2 hours', 120, CURRENT_DATE, '13:30:00', 'โรงแรม Pullman Bangkok King Power', 13.7566, 100.5360, 6.2, 1600.00, 1120.00, 'pending', 'Pullman Bangkok King Power', '1203'),

    -- งานชุดที่ 11-20
    (v_customer_id, NULL, 'คุณอรพิน สวยงาม', '0801234567', 'นวดแผนไทย 1.5 ชั่วโมง', 'Thai Massage 1.5 hours', 90, CURRENT_DATE, '14:00:00', 'โรงแรม Novotel Bangkok Platinum', 13.7486, 100.5368, 5.8, 1050.00, 735.00, 'pending', 'Novotel Bangkok Platinum', '908'),
    (v_customer_id, NULL, 'Ms. Lisa Anderson', '0812345602', 'นวดน้ำมันมะพร้าว 1 ชั่วโมง', 'Coconut Oil Massage 1 hour', 60, CURRENT_DATE, '14:30:00', 'โรงแรม Marriott Bangkok Sukhumvit', 13.7292, 100.5598, 4.9, 900.00, 630.00, 'pending', 'Marriott Bangkok Sukhumvit', '1405'),
    (v_customer_id, NULL, 'คุณพิชัย เจริญสุข', '0823456790', 'นวดเท้าไทย 1 ชั่วโมง', 'Thai Foot Massage 1 hour', 60, CURRENT_DATE, '15:00:00', 'โรงแรม Centara Grand CentralWorld', 13.7468, 100.5393, 5.1, 750.00, 525.00, 'pending', 'Centara Grand CentralWorld', '2101'),
    (v_customer_id, NULL, 'Mr. James Wilson', '0834567891', 'นวดหลัง 45 นาที', 'Back Massage 45 min', 45, CURRENT_DATE, '15:30:00', 'โรงแรม Amari Watergate Bangkok', 13.7505, 100.5389, 5.5, 650.00, 455.00, 'pending', 'Amari Watergate Bangkok', '1702'),
    (v_customer_id, NULL, 'คุณสมชาย รักดี', '0845678902', 'นวดสปอร์ตกล้ามเนื้อ 1.5 ชั่วโมง', 'Sports Deep Tissue 1.5 hours', 90, CURRENT_DATE, '16:00:00', 'โรงแรม Holiday Inn Silom', 13.7245, 100.5268, 4.7, 1200.00, 840.00, 'pending', 'Holiday Inn Silom', '1109'),
    (v_customer_id, NULL, 'Ms. Emily Chen', '0856789013', 'นวดอโรมาเทอราพี 2 ชั่วโมง', 'Aromatherapy 2 hours', 120, CURRENT_DATE, '16:30:00', 'โรงแรม Mercure Bangkok Sukhumvit', 13.7353, 100.5634, 5.3, 1700.00, 1190.00, 'pending', 'Mercure Bangkok Sukhumvit', '803'),
    (v_customer_id, NULL, 'คุณวรรณา มั่งมี', '0867890124', 'นวดไทยประยุกต์ 1 ชั่วโมง', 'Thai Fusion Massage 1 hour', 60, CURRENT_DATE, '17:00:00', 'โรงแรม Ibis Bangkok Riverside', 13.7128, 100.5141, 8.1, 850.00, 595.00, 'pending', 'Ibis Bangkok Riverside', '605'),
    (v_customer_id, NULL, 'Mr. Robert Taylor', '0878901235', 'นวดหินเย็น 1.5 ชั่วโมง', 'Cold Stone Massage 1.5 hours', 90, CURRENT_DATE, '17:30:00', 'โรงแรม Swissotel Bangkok Ratchada', 13.7637, 100.5643, 7.5, 1550.00, 1085.00, 'pending', 'Swissotel Bangkok Ratchada', '1801'),
    (v_customer_id, NULL, 'คุณสุดารัตน์ ใจดี', '0889012346', 'นวดคลายเครียด 1 ชั่วโมง', 'Relaxation Massage 1 hour', 60, CURRENT_DATE, '18:00:00', 'โรงแรม Courtyard by Marriott Bangkok', 13.7449, 100.5508, 3.2, 950.00, 665.00, 'pending', 'Courtyard by Marriott Bangkok', '1204'),
    (v_customer_id, NULL, 'Ms. Jennifer White', '0890123457', 'นวดน้ำมันหอมระเหย 2 ชั่วโมง', 'Essential Oil Massage 2 hours', 120, CURRENT_DATE, '18:30:00', 'โรงแรม Rembrandt Hotel Bangkok', 13.7301, 100.5611, 4.8, 1800.00, 1260.00, 'pending', 'Rembrandt Hotel Bangkok', '901'),

    -- งานชุดที่ 21-30
    (v_customer_id, NULL, 'คุณประดิษฐ์ มีทรัพย์', '0801234568', 'นวดแผนไทยบำบัด 1.5 ชั่วโมง', 'Thai Therapeutic 1.5 hours', 90, CURRENT_DATE, '19:00:00', 'โรงแรม The Sukhothai Bangkok', 13.7229, 100.5416, 3.9, 1450.00, 1015.00, 'pending', 'The Sukhothai Bangkok', '508'),
    (v_customer_id, NULL, 'Mr. Christopher Lee', '0812345603', 'นวดสปอร์ตเข้ม 1 ชั่วโมง', 'Intensive Sports Massage 1 hour', 60, CURRENT_DATE, '19:30:00', 'โรงแรม Chatrium Hotel Riverside', 13.7095, 100.5093, 8.4, 1100.00, 770.00, 'pending', 'Chatrium Hotel Riverside', '1506'),
    (v_customer_id, NULL, 'คุณมานิตา รุ่งเรือง', '0823456791', 'นวดเท้าฝ่าเท้า 1 ชั่วโมง', 'Foot Reflexology 1 hour', 60, CURRENT_DATE, '20:00:00', 'โรงแรม VIE Hotel Bangkok', 13.7324, 100.5658, 5.2, 700.00, 490.00, 'pending', 'VIE Hotel Bangkok', '1003'),
    (v_customer_id, NULL, 'Ms. Amanda Davis', '0834567892', 'นวดผ่อนคลาย 1.5 ชั่วโมง', 'Swedish Massage 1.5 hours', 90, CURRENT_DATE, '20:30:00', 'โรงแรม COMO Metropolitan Bangkok', 13.7215, 100.5426, 4.1, 1500.00, 1050.00, 'pending', 'COMO Metropolitan Bangkok', '702'),
    (v_customer_id, NULL, 'คุณธนากร ชัยชนะ', '0845678903', 'นวดแผนไทยดั้งเดิม 2 ชั่วโมง', 'Traditional Thai Massage 2 hours', 120, CURRENT_DATE, '21:00:00', 'โรงแรม The Athenee Hotel', 13.7423, 100.5558, 3.6, 1300.00, 910.00, 'pending', 'The Athenee Hotel', '1408'),
    (v_customer_id, NULL, 'Mr. Thomas Anderson', '0856789014', 'นวดน้ำมันรักษา 1 ชั่วโมง', 'Therapeutic Oil Massage 1 hour', 60, CURRENT_DATE, '21:30:00', 'โรงแรม Grand Hyatt Erawan', 13.7445, 100.5433, 2.5, 1200.00, 840.00, 'pending', 'Grand Hyatt Erawan', '1609'),
    (v_customer_id, NULL, 'คุณพรทิพย์ สุขสันต์', '0867890125', 'นวดไทยสมุนไพร 1.5 ชั่วโมง', 'Thai Herbal Massage 1.5 hours', 90, CURRENT_DATE + 1, '08:00:00', 'โรงแรม Renaissance Bangkok Ratchaprasong', 13.7439, 100.5399, 3.1, 1350.00, 945.00, 'pending', 'Renaissance Bangkok Ratchaprasong', '1205'),
    (v_customer_id, NULL, 'Ms. Jessica Martin', '0878901236', 'นวดหินร้อนเย็น 2 ชั่วโมง', 'Hot Cold Stone 2 hours', 120, CURRENT_DATE + 1, '08:30:00', 'โรงแรม Mode Sathorn Hotel', 13.7189, 100.5243, 5.8, 1950.00, 1365.00, 'pending', 'Mode Sathorn Hotel', '804'),
    (v_customer_id, NULL, 'คุณสุรชัย ดีมาก', '0889012347', 'นวดคอไหล่ 45 นาที', 'Shoulder & Neck Massage 45 min', 45, CURRENT_DATE + 1, '09:00:00', 'โรงแรม Novotel Bangkok Suvarnabhumi', 13.6884, 100.7493, 32.5, 650.00, 455.00, 'pending', 'Novotel Bangkok Suvarnabhumi', '1102'),
    (v_customer_id, NULL, 'Mr. Daniel Kim', '0890123458', 'นวดบำบัดกล้ามเนื้อ 1 ชั่วโมง', 'Muscle Therapy Massage 1 hour', 60, CURRENT_DATE + 1, '09:30:00', 'โรงแรม Crowne Plaza Bangkok Lumpini', 13.7256, 100.5320, 4.6, 1000.00, 700.00, 'pending', 'Crowne Plaza Bangkok Lumpini', '1507'),

    -- งานชุดที่ 31-40
    (v_customer_id, NULL, 'คุณนภาพร สง่างาม', '0801234569', 'นวดแผนไทยเพื่อสุขภาพ 1.5 ชั่วโมง', 'Thai Health Massage 1.5 hours', 90, CURRENT_DATE + 1, '10:00:00', 'โรงแรม The Okura Prestige', 13.7462, 100.5427, 3.3, 1400.00, 980.00, 'pending', 'The Okura Prestige', '2001'),
    (v_customer_id, NULL, 'Ms. Sophia Garcia', '0812345604', 'นวดน้ำมันลาเวนเดอร์ 1 ชั่วโมง', 'Lavender Oil Massage 1 hour', 60, CURRENT_DATE + 1, '10:30:00', 'โรงแรม Pathumwan Princess Hotel', 13.7458, 100.5324, 4.2, 850.00, 595.00, 'pending', 'Pathumwan Princess Hotel', '1308'),
    (v_customer_id, NULL, 'คุณวีระ ยิ่งใหญ่', '0823456792', 'นวดเท้าผ่อนคลาย 1 ชั่วโมง', 'Relaxing Foot Massage 1 hour', 60, CURRENT_DATE + 1, '11:00:00', 'โรงแรม Centre Point Pratunam', 13.7517, 100.5372, 5.4, 650.00, 455.00, 'pending', 'Centre Point Pratunam', '906'),
    (v_customer_id, NULL, 'Mr. Matthew Wilson', '0834567893', 'นวดสปอร์ตฟื้นฟู 2 ชั่วโมง', 'Sports Recovery Massage 2 hours', 120, CURRENT_DATE + 1, '11:30:00', 'โรงแรม Vie Hotel Bangkok MGallery', 13.7324, 100.5658, 5.2, 1750.00, 1225.00, 'pending', 'Vie Hotel Bangkok MGallery', '1704'),
    (v_customer_id, NULL, 'คุณชนิดา สดใส', '0845678904', 'นวดไทยเพื่อผ่อนคลาย 1 ชั่วโมง', 'Thai Relaxation Massage 1 hour', 60, CURRENT_DATE + 1, '12:00:00', 'โรงแรม The Berkeley Hotel Pratunam', 13.7534, 100.5361, 5.6, 800.00, 560.00, 'pending', 'The Berkeley Hotel Pratunam', '1201'),
    (v_customer_id, NULL, 'Ms. Olivia Brown', '0856789015', 'นวดอโรมาผ่อนคลาย 1.5 ชั่วโมง', 'Relaxing Aromatherapy 1.5 hours', 90, CURRENT_DATE + 1, '12:30:00', 'โรงแรม Radisson Blu Plaza Bangkok', 13.7305, 100.5618, 4.9, 1300.00, 910.00, 'pending', 'Radisson Blu Plaza Bangkok', '808'),
    (v_customer_id, NULL, 'คุณสมบูรณ์ เจริญรุ่ง', '0867890126', 'นวดหินอุ่น 2 ชั่วโมง', 'Warm Stone Massage 2 hours', 120, CURRENT_DATE + 1, '13:00:00', 'โรงแรม Grand Sukhumvit Hotel', 13.7279, 100.5589, 4.7, 1850.00, 1295.00, 'pending', 'Grand Sukhumvit Hotel', '1505'),
    (v_customer_id, NULL, 'Mr. Andrew Taylor', '0878901237', 'นวดบำบัดเฉพาะจุด 1 ชั่วโมง', 'Trigger Point Therapy 1 hour', 60, CURRENT_DATE + 1, '13:30:00', 'โรงแรม DoubleTree by Hilton Sukhumvit', 13.7341, 100.5654, 5.3, 1050.00, 735.00, 'pending', 'DoubleTree by Hilton Sukhumvit', '1009'),
    (v_customer_id, NULL, 'คุณอัญชลี งามสง่า', '0889012348', 'นวดแผนไทยสไตล์เหนือ 1.5 ชั่วโมง', 'Northern Thai Massage 1.5 hours', 90, CURRENT_DATE + 1, '14:00:00', 'โรงแรม Aloft Bangkok Sukhumvit 11', 13.7434, 100.5590, 4.1, 1150.00, 805.00, 'pending', 'Aloft Bangkok Sukhumvit 11', '1403'),
    (v_customer_id, NULL, 'Ms. Rachel Martinez', '0890123459', 'นวดน้ำมันยูคาลิปตัส 1 ชั่วโมง', 'Eucalyptus Oil Massage 1 hour', 60, CURRENT_DATE + 1, '14:30:00', 'โรงแรม Siam@Siam Design Hotel', 13.7519, 100.5327, 5.1, 900.00, 630.00, 'pending', 'Siam@Siam Design Hotel', '707'),

    -- งานชุดที่ 41-50
    (v_customer_id, NULL, 'คุณพิทักษ์ แข็งแกร่ง', '0801234570', 'นวดสปอร์ตเข้มข้น 1.5 ชั่วโมง', 'Intensive Sports Massage 1.5 hours', 90, CURRENT_DATE + 1, '15:00:00', 'โรงแรม Jasmine City Hotel', 13.7295, 100.5604, 4.8, 1250.00, 875.00, 'pending', 'Jasmine City Hotel', '1606'),
    (v_customer_id, NULL, 'Mr. Kevin Johnson', '0812345605', 'นวดเท้าบำบัด 1 ชั่วโมง', 'Therapeutic Foot Massage 1 hour', 60, CURRENT_DATE + 1, '15:30:00', 'โรงแรม Majestic Grande Hotel', 13.7290, 100.5594, 4.9, 750.00, 525.00, 'pending', 'Majestic Grande Hotel', '1105'),
    (v_customer_id, NULL, 'คุณสุนีย์ แจ่มใส', '0823456793', 'นวดไทยผสมออยล์ 2 ชั่วโมง', 'Thai Oil Combination 2 hours', 120, CURRENT_DATE + 1, '16:00:00', 'โรงแรม Admiral Suites Bangkok', 13.7270, 100.5581, 5.0, 1650.00, 1155.00, 'pending', 'Admiral Suites Bangkok', '902'),
    (v_customer_id, NULL, 'Ms. Hannah Lee', '0834567894', 'นวดอโรมาเจาะลึก 1 ชั่วโมง', 'Deep Aromatherapy 1 hour', 60, CURRENT_DATE + 1, '16:30:00', 'โรงแรม S31 Sukhumvit Hotel', 13.7309, 100.5639, 5.1, 950.00, 665.00, 'pending', 'S31 Sukhumvit Hotel', '1208'),
    (v_customer_id, NULL, 'คุณทวีศักดิ์ มั่งคั่ง', '0845678905', 'นวดหลังคอไหล่ 45 นาที', 'Back Neck Shoulder 45 min', 45, CURRENT_DATE + 1, '17:00:00', 'โรงแรม Legacy Suites Sukhumvit', 13.7301, 100.5628, 4.9, 700.00, 490.00, 'pending', 'Legacy Suites Sukhumvit', '1004'),
    (v_customer_id, NULL, 'Mr. Brandon Clark', '0856789016', 'นวดบำบัดแบบองค์รวม 2 ชั่วโมง', 'Holistic Therapy Massage 2 hours', 120, CURRENT_DATE + 1, '17:30:00', 'โรงแรม Ascott Sathorn Bangkok', 13.7195, 100.5285, 5.5, 2000.00, 1400.00, 'pending', 'Ascott Sathorn Bangkok', '1801'),
    (v_customer_id, NULL, 'คุณศิริพร ดีงาม', '0867890127', 'นวดแผนไทยสไตล์อีสาน 1 ชั่วโมง', 'Isaan Thai Massage 1 hour', 60, CURRENT_DATE + 1, '18:00:00', 'โรงแรม Fraser Suites Sukhumvit', 13.7315, 100.5642, 5.2, 850.00, 595.00, 'pending', 'Fraser Suites Sukhumvit', '1307'),
    (v_customer_id, NULL, 'Ms. Megan White', '0878901238', 'นวดน้ำมันผสมสมุนไพร 1.5 ชั่วโมง', 'Herbal Oil Massage 1.5 hours', 90, CURRENT_DATE + 1, '18:30:00', 'โรงแรม Citadines Sukhumvit 23', 13.7377, 100.5647, 4.8, 1200.00, 840.00, 'pending', 'Citadines Sukhumvit 23', '905'),
    (v_customer_id, NULL, 'คุณณัฐพล เจริญดี', '0889012349', 'นวดคลายเครียดเข้มข้น 1 ชั่วโมง', 'Intensive Relaxation 1 hour', 60, CURRENT_DATE + 1, '19:00:00', 'โรงแรม Somerset Sukhumvit Thonglor', 13.7324, 100.5751, 5.8, 950.00, 665.00, 'pending', 'Somerset Sukhumvit Thonglor', '1506'),
    (v_customer_id, NULL, 'Ms. Chloe Harris', '0890123460', 'นวดผ่อนคลายทั่วร่าง 2 ชั่วโมง', 'Full Body Relaxation 2 hours', 120, CURRENT_DATE + 1, '19:30:00', 'โรงแรม Oakwood Residence Sukhumvit 24', 13.7347, 100.5656, 5.1, 1700.00, 1190.00, 'pending', 'Oakwood Residence Sukhumvit 24', '1203');

    GET DIAGNOSTICS v_job_count = ROW_COUNT;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'เพิ่มงาน Pending สำเร็จ: % งาน', v_job_count;
    RAISE NOTICE '============================================';

END $$;

-- แสดงสรุปงาน Pending ทั้งหมด
SELECT
    COUNT(*) as "จำนวนงาน Pending ทั้งหมด",
    ROUND(SUM(staff_earnings), 2) as "รายได้รวม",
    MIN(scheduled_date) as "วันแรก",
    MAX(scheduled_date) as "วันสุดท้าย"
FROM jobs
WHERE status = 'pending'
  AND customer_id IN (SELECT id FROM profiles WHERE email = 'customer.mockup@theblissathome.com');

-- แสดง 10 งาน Pending แรก
SELECT
    service_name as "บริการ",
    customer_name as "ลูกค้า",
    scheduled_date as "วันที่",
    scheduled_time as "เวลา",
    staff_earnings as "รายได้",
    hotel_name as "โรงแรม"
FROM jobs
WHERE status = 'pending'
  AND customer_id IN (SELECT id FROM profiles WHERE email = 'customer.mockup@theblissathome.com')
ORDER BY scheduled_date, scheduled_time
LIMIT 10;
