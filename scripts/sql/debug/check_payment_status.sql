-- ตรวจสอบ payment status ใน database
-- Date: 2026-05-18

-- เช็คสถานะ payment ของ booking ที่ทดสอบ
SELECT
  booking_number,
  customer_name,
  payment_method,
  payment_status,
  final_price,
  base_price,
  status AS booking_status,
  created_at,
  updated_at
FROM bookings
WHERE booking_number IN ('BK20260518-GPS1', 'BK20260518-GPS2')
ORDER BY created_at DESC;

-- เช็ค transactions table (ถ้ามี)
SELECT
  t.id,
  t.booking_id,
  t.amount,
  t.status AS transaction_status,
  t.payment_method,
  t.created_at,
  b.booking_number
FROM transactions t
JOIN bookings b ON t.booking_id = b.id
WHERE b.booking_number IN ('BK20260518-GPS1', 'BK20260518-GPS2')
ORDER BY t.created_at DESC;

-- เช็ค payments table (ถ้ามี)
SELECT
  p.*,
  b.booking_number
FROM payments p
JOIN bookings b ON p.booking_id = b.id
WHERE b.booking_number IN ('BK20260518-GPS1', 'BK20260518-GPS2')
ORDER BY p.created_at DESC;