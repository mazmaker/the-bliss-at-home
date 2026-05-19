-- สร้าง booking ทดสอบใหม่สำหรับ GPS tracking
-- Date: 2026-05-18

-- สร้าง booking BK20260517-0305
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
  created_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'BK20260517-0305',
  '49c16fec-99e5-4aac-981b-2f3007eb715e', -- customer user ID
  'คุณสมใส ใจดี',
  '0944444444',
  'เตย (0944444), 300, บางลำภูล่าง, คลองสาน, กรุงเทพมหานคร, 10600',
  13.75471599,
  100.49688619,
  (SELECT id FROM services LIMIT 1), -- ใช้ service แรกที่เจอ
  (SELECT id FROM staff LIMIT 1), -- ใช้ staff แรกที่เจอ
  CURRENT_DATE,
  '14:00:00',
  'confirmed',
  1500,
  1500,
  120,
  NOW() - INTERVAL '1 day'
) ON CONFLICT (booking_number) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  customer_address = EXCLUDED.customer_address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  status = EXCLUDED.status;

-- สร้าง staff journey สำหรับ booking นี้
INSERT INTO staff_journeys (
  id,
  booking_id,
  staff_id,
  status,
  current_latitude,
  current_longitude,
  started_at,
  last_location_update
) VALUES (
  '85be919b-51af-44b8-9d4f-8e8287869860',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  (SELECT id FROM staff LIMIT 1),
  'traveling',
  13.7563,
  100.5018,
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '2 minutes'
) ON CONFLICT (id) DO UPDATE SET
  current_latitude = EXCLUDED.current_latitude,
  current_longitude = EXCLUDED.current_longitude,
  last_location_update = EXCLUDED.last_location_update;

-- อัพเดท booking status ให้เป็น traveling
UPDATE bookings
SET status = 'traveling', started_at = NOW() - INTERVAL '10 minutes'
WHERE booking_number = 'BK20260517-0305';