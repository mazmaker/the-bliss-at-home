-- Seed data for bookings table
-- This migration creates sample bookings for testing

-- First, ensure we have some customers, services, and staff to reference
-- We'll use existing data or create temporary test data

DO $$
DECLARE
  v_customer_id UUID;
  v_hotel_id UUID;
  v_staff_id_1 UUID;
  v_staff_id_2 UUID;
  v_service_massage UUID;
  v_service_nail UUID;
  v_service_spa UUID;
BEGIN
  -- Get or create a test customer
  SELECT id INTO v_customer_id FROM customers LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create a test customer if none exists
    INSERT INTO customers (
      full_name, phone, address
    ) VALUES (
      'ลูกค้าทดสอบ', '081-234-5678', '123 ถนนสุขุมวิท กรุงเทพฯ'
    ) RETURNING id INTO v_customer_id;
  END IF;

  -- Get hotel ID if exists
  SELECT id INTO v_hotel_id FROM hotels LIMIT 1;

  -- Get staff members
  SELECT id INTO v_staff_id_1 FROM staff WHERE status = 'active' LIMIT 1;
  SELECT id INTO v_staff_id_2 FROM staff WHERE status = 'active' LIMIT 1 OFFSET 1;

  -- Get or create services
  SELECT id INTO v_service_massage FROM services WHERE name_th ILIKE '%นวด%' OR category = 'massage' LIMIT 1;
  SELECT id INTO v_service_nail FROM services WHERE name_th ILIKE '%เล็บ%' OR category = 'nail' LIMIT 1;
  SELECT id INTO v_service_spa FROM services WHERE name_th ILIKE '%สปา%' OR category = 'spa' LIMIT 1;

  -- If services don't exist, create them
  IF v_service_massage IS NULL THEN
    INSERT INTO services (name_th, name_en, category, duration, base_price, hotel_price, description_th)
    VALUES ('นวดแผนไทย', 'Thai Massage', 'massage', 120, 800, 700, 'นวดแผนไทยแบบดั้งเดิม')
    RETURNING id INTO v_service_massage;
  END IF;

  IF v_service_nail IS NULL THEN
    INSERT INTO services (name_th, name_en, category, duration, base_price, hotel_price, description_th)
    VALUES ('ทำเล็บเจล', 'Gel Manicure', 'nail', 60, 360, 320, 'บริการทำเล็บเจลมืออาชีพ')
    RETURNING id INTO v_service_nail;
  END IF;

  IF v_service_spa IS NULL THEN
    INSERT INTO services (name_th, name_en, category, duration, base_price, hotel_price, description_th)
    VALUES ('สปาแพ็คเกจหรู', 'Luxury Spa Package', 'spa', 150, 2000, 1800, 'บริการสปาครบวงจรระดับหรู')
    RETURNING id INTO v_service_spa;
  END IF;

  -- Delete existing test bookings to avoid duplicates
  DELETE FROM bookings WHERE booking_number LIKE 'BK20260115%';

  -- Insert sample bookings
  -- Booking 1: Confirmed massage booking (customer direct)
  INSERT INTO bookings (
    booking_number,
    customer_id,
    hotel_id,
    staff_id,
    service_id,
    booking_date,
    booking_time,
    duration,
    is_hotel_booking,
    address,
    base_price,
    discount_amount,
    final_price,
    status,
    payment_status,
    staff_earnings,
    customer_notes,
    confirmed_at,
    created_at
  ) VALUES (
    'BK20260115001',
    v_customer_id,
    NULL,
    v_staff_id_1,
    v_service_massage,
    '2026-01-15',
    '14:00',
    120,
    false,
    '123 ถนนสุขุมวิท ปทุมวัน กรุงเทพฯ',
    800,
    0,
    800,
    'confirmed',
    'paid',
    640, -- 80% of price
    'ลูกค้าขอนวดเน้นบริเวณหลังและไหล่',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '3 days'
  );

  -- Booking 2: Completed nail service at hotel
  INSERT INTO bookings (
    booking_number,
    customer_id,
    hotel_id,
    staff_id,
    service_id,
    booking_date,
    booking_time,
    duration,
    is_hotel_booking,
    hotel_room_number,
    address,
    base_price,
    discount_amount,
    final_price,
    status,
    payment_status,
    staff_earnings,
    customer_notes,
    confirmed_at,
    started_at,
    completed_at,
    created_at
  ) VALUES (
    'BK20260115002',
    v_customer_id,
    v_hotel_id,
    v_staff_id_2,
    v_service_nail,
    '2026-01-15',
    '10:30',
    60,
    true,
    '1505',
    COALESCE((SELECT name_th FROM hotels WHERE id = v_hotel_id LIMIT 1), 'โรงแรมฮิลตัน'),
    400,
    40, -- 10% discount
    360,
    'completed',
    'paid',
    288, -- 80% of final price
    'สีเล็บโทนชมพูอ่อน',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days' + INTERVAL '10 minutes',
    NOW() - INTERVAL '5 days' + INTERVAL '70 minutes',
    NOW() - INTERVAL '6 days'
  );

  -- Booking 3: In-progress spa service
  INSERT INTO bookings (
    booking_number,
    customer_id,
    hotel_id,
    staff_id,
    service_id,
    booking_date,
    booking_time,
    duration,
    is_hotel_booking,
    address,
    base_price,
    discount_amount,
    final_price,
    status,
    payment_status,
    staff_earnings,
    customer_notes,
    confirmed_at,
    started_at,
    created_at
  ) VALUES (
    'BK20260115003',
    v_customer_id,
    NULL,
    v_staff_id_1,
    v_service_spa,
    '2026-01-15',
    '16:00',
    150,
    false,
    '456 ถนนสีลม สีลม กรุงเทพฯ',
    2000,
    0,
    2000,
    'in_progress',
    'paid',
    1600, -- 80% of price
    'แพ้กลิ่นหอมฉุน กรุณาใช้น้ำมันไม่มีกลิ่น',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '2 hours'
  );

  -- Booking 4: Pending booking (waiting for staff assignment)
  INSERT INTO bookings (
    booking_number,
    customer_id,
    hotel_id,
    staff_id,
    service_id,
    booking_date,
    booking_time,
    duration,
    is_hotel_booking,
    hotel_room_number,
    address,
    base_price,
    discount_amount,
    final_price,
    status,
    payment_status,
    customer_notes,
    admin_notes,
    created_at
  ) VALUES (
    'BK20260115004',
    v_customer_id,
    v_hotel_id,
    NULL, -- No staff assigned yet
    v_service_massage,
    '2026-01-15',
    '13:00',
    120,
    true,
    '302',
    COALESCE((SELECT name_th FROM hotels WHERE id = v_hotel_id LIMIT 1), 'รีสอร์ทในฝัน'),
    800,
    0,
    800,
    'pending',
    'pending',
    'ต้องการนวดแบบผ่อนคลาย',
    'รอมอบหมายพนักงาน',
    NOW() - INTERVAL '1 day'
  );

  -- Booking 5: Cancelled booking
  INSERT INTO bookings (
    booking_number,
    customer_id,
    hotel_id,
    staff_id,
    service_id,
    booking_date,
    booking_time,
    duration,
    is_hotel_booking,
    address,
    base_price,
    discount_amount,
    final_price,
    status,
    payment_status,
    customer_notes,
    admin_notes,
    confirmed_at,
    cancelled_at,
    created_at
  ) VALUES (
    'BK20260115005',
    v_customer_id,
    NULL,
    v_staff_id_1,
    v_service_spa,
    '2026-01-15',
    '11:00',
    90,
    false,
    '789 ถนนพระราม 3 บางนา กรุงเทพฯ',
    1200,
    240, -- 20% discount
    960,
    'cancelled',
    'refunded',
    'ขอทำ Facial Treatment',
    'ลูกค้ายกเลิกเนื่องจากติดธุระ คืนเงินเรียบร้อยแล้ว',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '5 days'
  );

  -- Add more realistic bookings for better testing
  INSERT INTO bookings (
    customer_id,
    hotel_id,
    staff_id,
    service_id,
    booking_date,
    booking_time,
    duration,
    is_hotel_booking,
    address,
    base_price,
    final_price,
    status,
    payment_status,
    staff_earnings,
    created_at
  ) VALUES
  -- Recent confirmed booking
  (
    v_customer_id, NULL, v_staff_id_2, v_service_massage,
    CURRENT_DATE + INTERVAL '2 days', '09:00', 120, false,
    '234 ถนนรัชดาภิเษก ห้วยขวาง กรุงเทพฯ',
    800, 800, 'confirmed', 'paid', 640,
    NOW() - INTERVAL '6 hours'
  ),
  -- Upcoming pending booking
  (
    v_customer_id, v_hotel_id, NULL, v_service_spa,
    CURRENT_DATE + INTERVAL '3 days', '15:00', 150, true,
    COALESCE((SELECT name_th FROM hotels WHERE id = v_hotel_id LIMIT 1), 'Grand Hotel'),
    2000, 2000, 'pending', 'pending', 0,
    NOW() - INTERVAL '12 hours'
  );

  RAISE NOTICE 'Successfully seeded bookings data';
END $$;
