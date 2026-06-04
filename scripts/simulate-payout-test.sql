-- ============================================
-- สคริปต์จำลองข้อมูลสำหรับทดสอบ Automated Payout
-- ============================================

-- 1. เช็คข้อมูล staff ปัจจุบัน
SELECT
  s.id,
  p.full_name,
  s.name_th,
  s.payout_schedule,
  s.next_payout_date,
  s.last_payout_processed_at,
  s.is_active
FROM staff s
JOIN profiles p ON p.id = s.profile_id
WHERE s.is_active = true
ORDER BY s.created_at DESC
LIMIT 5;

-- 2. อัปเดต staff คนแรกให้ครบรอบวันนี้
UPDATE staff
SET
  next_payout_date = CURRENT_DATE,
  payout_schedule = 'weekly'
WHERE id = (
  SELECT id FROM staff
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
);

-- 3. สร้าง booking และ job จำลอง (7 วันที่ผ่านมา)
WITH test_staff AS (
  SELECT id as staff_id, profile_id
  FROM staff
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
),
test_customer AS (
  SELECT id as customer_id
  FROM customers
  ORDER BY created_at DESC
  LIMIT 1
),
new_booking AS (
  INSERT INTO bookings (
    customer_id,
    service_id,
    preferred_date,
    preferred_time,
    duration,
    location_type,
    status,
    total_price,
    created_at
  )
  SELECT
    tc.customer_id,
    1, -- service_id (ใช้ service แรก)
    CURRENT_DATE - INTERVAL '3 days',
    '14:00:00',
    90,
    'customer_home',
    'completed',
    2500.00,
    CURRENT_DATE - INTERVAL '3 days'
  FROM test_customer tc
  RETURNING id, customer_id
)
INSERT INTO jobs (
  booking_id,
  staff_id,
  scheduled_date,
  scheduled_time,
  duration,
  status,
  staff_earnings,
  created_at,
  completed_at
)
SELECT
  nb.id,
  ts.staff_id,
  CURRENT_DATE - INTERVAL '3 days',
  '14:00:00',
  90,
  'completed',
  800.00,
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE - INTERVAL '3 days' + INTERVAL '2 hours'
FROM new_booking nb, test_staff ts;

-- 4. สร้างอีก 2 งานเพิ่มเติม
WITH test_staff AS (
  SELECT id as staff_id, profile_id
  FROM staff
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
),
test_customer AS (
  SELECT id as customer_id
  FROM customers
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO bookings (
  customer_id,
  service_id,
  preferred_date,
  preferred_time,
  duration,
  location_type,
  status,
  total_price,
  created_at
) VALUES
(
  (SELECT customer_id FROM test_customer),
  2,
  CURRENT_DATE - INTERVAL '1 day',
  '16:00:00',
  120,
  'customer_home',
  'completed',
  3000.00,
  CURRENT_DATE - INTERVAL '1 day'
),
(
  (SELECT customer_id FROM test_customer),
  3,
  CURRENT_DATE - INTERVAL '5 days',
  '10:00:00',
  60,
  'customer_home',
  'completed',
  1800.00,
  CURRENT_DATE - INTERVAL '5 days'
);

-- สร้าง jobs สำหรับ bookings เหล่านี้
WITH test_staff AS (
  SELECT id as staff_id FROM staff WHERE is_active = true ORDER BY created_at DESC LIMIT 1
),
recent_bookings AS (
  SELECT id, preferred_date, preferred_time, duration, total_price * 0.4 as earnings
  FROM bookings
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND status = 'completed'
    AND id NOT IN (SELECT DISTINCT booking_id FROM jobs WHERE booking_id IS NOT NULL)
  ORDER BY created_at DESC
  LIMIT 2
)
INSERT INTO jobs (
  booking_id,
  staff_id,
  scheduled_date,
  scheduled_time,
  duration,
  status,
  staff_earnings,
  created_at,
  completed_at
)
SELECT
  rb.id,
  ts.staff_id,
  rb.preferred_date,
  rb.preferred_time,
  rb.duration,
  'completed',
  rb.earnings,
  rb.preferred_date,
  rb.preferred_date + rb.preferred_time::time + INTERVAL '2 hours'
FROM recent_bookings rb, test_staff ts;

-- 5. เช็คผลลัพธ์
SELECT
  s.name_th,
  s.payout_schedule,
  s.next_payout_date,
  COUNT(j.id) as total_jobs,
  SUM(j.staff_earnings) as total_earnings,
  MIN(j.completed_at) as earliest_job,
  MAX(j.completed_at) as latest_job
FROM staff s
LEFT JOIN jobs j ON j.staff_id = s.id
  AND j.status = 'completed'
  AND j.completed_at >= CURRENT_DATE - INTERVAL '7 days'
WHERE s.is_active = true
  AND s.next_payout_date = CURRENT_DATE
GROUP BY s.id, s.name_th, s.payout_schedule, s.next_payout_date
ORDER BY total_earnings DESC;

-- 6. พร้อมทดสอบ!
SELECT
  'Ready for testing!' as message,
  'Staff with next_payout_date = today: ' || COUNT(*) as status
FROM staff
WHERE next_payout_date = CURRENT_DATE
  AND is_active = true;