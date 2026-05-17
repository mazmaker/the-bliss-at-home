-- Seed data สำหรับ GPS Tracking (ไม่หายง่าย)
-- Date: 2026-05-18

-- สร้าง customer profile ทดสอบ (ถ้ายังไม่มี)
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  phone,
  created_at
) VALUES (
  '49c16fec-99e5-4aac-981b-2f3007eb715e',
  'test.customer@bliss.com',
  'ลูกค้าทดสอบ',
  'CUSTOMER',
  '0812345678',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- สร้าง staff profile ทดสอบ
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  phone,
  created_at
) VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'test.staff@bliss.com',
  'พนักงานทดสอบ GPS',
  'STAFF',
  '0887654321',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- สร้าง staff record
INSERT INTO staff (
  id,
  profile_id,
  status,
  created_at
) VALUES (
  'staff-test-001',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'active',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

-- สร้าง service ทดสอบ
INSERT INTO services (
  id,
  name_th,
  name_en,
  price,
  duration,
  status,
  created_at
) VALUES (
  'service-test-001',
  'นวดแผนไทยทดสอบ',
  'Thai Massage Test',
  1500,
  120,
  'active',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name_th = EXCLUDED.name_th,
  price = EXCLUDED.price;

-- สร้าง booking ทดสอบหลายอัน (ป้องกันหาย)
INSERT INTO bookings (
  id,
  booking_number,
  customer_id,
  customer_name,
  customer_phone,
  customer_address,
  latitude,
  longitude,
  service_id,
  staff_id,
  booking_date,
  booking_time,
  status,
  base_price,
  final_price,
  duration,
  payment_method,
  payment_status,
  created_at
) VALUES
-- Booking 1: GPS Test (ชำระแล้ว)
(
  'booking-gps-test-001',
  'BK20260518-GPS1',
  '49c16fec-99e5-4aac-981b-2f3007eb715e',
  'ลูกค้าทดสอบ GPS',
  '0812345678',
  'เตย (GPS Test), 300, บางลำภูล่าง, คลองสาน, กรุงเทพมหานคร, 10600',
  13.75471599,
  100.49688619,
  'service-test-001',
  'staff-test-001',
  CURRENT_DATE,
  '14:00:00',
  'confirmed',
  1500,
  1500,
  120,
  'credit_card',
  'paid',
  NOW()
),
-- Booking 2: Backup GPS Test (ชำระแล้ว)
(
  'booking-gps-test-002',
  'BK20260518-GPS2',
  '49c16fec-99e5-4aac-981b-2f3007eb715e',
  'ลูกค้าสำรอง',
  '0812345679',
  'สยามพารากอน, เขตปทุมวัน, กรุงเทพมหานคร, 10330',
  13.7460,
  100.5341,
  'service-test-001',
  'staff-test-001',
  CURRENT_DATE,
  '16:00:00',
  'traveling',
  1800,
  1800,
  150,
  'cash',
  'paid',
  NOW()
) ON CONFLICT (booking_number) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  status = EXCLUDED.status,
  customer_address = EXCLUDED.customer_address,
  payment_method = EXCLUDED.payment_method,
  payment_status = EXCLUDED.payment_status;

-- สร้าง staff journey ทดสอบ
INSERT INTO staff_journeys (
  id,
  booking_id,
  staff_id,
  status,
  current_latitude,
  current_longitude,
  started_at,
  last_location_update,
  created_at
) VALUES
-- Journey 1
(
  'journey-test-001',
  'booking-gps-test-001',
  'staff-test-001',
  'traveling',
  13.7563,
  100.5018,
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '1 minute',
  NOW()
),
-- Journey 2 (สำรอง)
(
  'journey-test-002',
  'booking-gps-test-002',
  'staff-test-001',
  'traveling',
  13.7465,
  100.5346,
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '30 seconds',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  current_latitude = EXCLUDED.current_latitude,
  current_longitude = EXCLUDED.current_longitude,
  last_location_update = NOW();

-- สร้าง transactions สำหรับ bookings ทดสอบ
INSERT INTO transactions (
  id,
  booking_id,
  customer_id,
  amount,
  status,
  payment_method,
  payment_intent_id,
  metadata,
  created_at,
  updated_at
) VALUES
-- Transaction สำหรับ GPS1
(
  'txn-gps-test-001',
  'booking-gps-test-001',
  '49c16fec-99e5-4aac-981b-2f3007eb715e',
  1500.00,
  'successful',
  'credit_card',
  'pi_test_gps_001',
  '{"card_brand": "visa", "card_last_digits": "4242", "test_transaction": true}',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
),
-- Transaction สำหรับ GPS2
(
  'txn-gps-test-002',
  'booking-gps-test-002',
  '49c16fec-99e5-4aac-981b-2f3007eb715e',
  1800.00,
  'successful',
  'cash',
  null,
  '{"test_transaction": true, "cash_payment": true}',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
) ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  updated_at = NOW();