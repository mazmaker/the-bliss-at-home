-- ตรวจสอบระบบ Commission ของ Staff
SELECT 
    s.id as staff_id,
    s.name_th as staff_name,
    s.commission_rate as staff_commission_rate,
    s.commission_type,
    -- ตัวอย่าง booking
    b.id as booking_id,
    b.final_price as customer_price,
    b.staff_earnings as staff_earnings_recorded,
    -- Extension data 
    bs.id as service_id,
    bs.price as service_price,
    bs.is_extension,
    bs.extended_at
FROM staff s
LEFT JOIN bookings b ON s.id = b.staff_id AND b.status = 'completed'
LEFT JOIN booking_services bs ON b.id = bs.booking_id
WHERE s.status = 'active'
ORDER BY s.id, b.created_at DESC
LIMIT 10;
