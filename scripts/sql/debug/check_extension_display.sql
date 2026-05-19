-- ตรวจสอบการแสดงผล Extension ใน Hotel App และ Staff App
SELECT 
    b.id as booking_id,
    b.booking_number,
    b.status,
    b.final_price,
    b.extension_count,
    b.total_extensions_price,
    -- Booking services (รวมส่วนที่เพิ่ม)
    bs.id as service_id,
    bs.duration,
    bs.price as service_price,
    bs.is_extension,
    bs.extended_at,
    bs.original_booking_service_id,
    s.name_th as service_name
FROM bookings b
LEFT JOIN booking_services bs ON b.id = bs.booking_id
LEFT JOIN services s ON bs.service_id = s.id
WHERE b.extension_count > 0 
    OR bs.is_extension = true
ORDER BY b.created_at DESC, bs.sort_order;
