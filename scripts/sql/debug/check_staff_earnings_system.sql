-- ตรวจสอบระบบรายได้ Staff ปัจจุบัน
SELECT 
    s.id as staff_id,
    s.name_th as staff_name,
    s.commission_rate,
    s.commission_type,
    -- ตัวอย่างการจอง
    b.id as booking_id,
    b.final_price as customer_paid,
    b.staff_earnings as staff_received,
    -- เปรียบเทียบ
    CASE 
        WHEN b.final_price > 0 THEN ROUND((b.staff_earnings * 100.0 / b.final_price), 2)
        ELSE 0
    END as actual_percentage,
    -- บริการ
    srv.name_th as service_name,
    srv.duration,
    srv.price_60,
    srv.price_90,
    srv.price_120
FROM staff s
LEFT JOIN bookings b ON s.id = b.staff_id AND b.status = 'completed'
LEFT JOIN services srv ON b.service_id = srv.id
WHERE s.status = 'active'
ORDER BY s.id, b.created_at DESC
LIMIT 5;
