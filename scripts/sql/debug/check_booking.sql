
-- เช็คว่ามี booking BK20260517-0305 หรือไม่
SELECT 
  booking_number, 
  customer_name, 
  status, 
  staff_id,
  created_at
FROM bookings 
WHERE booking_number = 'BK20260517-0305'
LIMIT 5;

-- เช็คข้อมูล bookings ที่มีล่าสุด
SELECT 
  booking_number, 
  customer_name, 
  status,
  created_at
FROM bookings 
ORDER BY created_at DESC 
LIMIT 5;

