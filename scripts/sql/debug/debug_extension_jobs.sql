-- ตรวจสอบงานที่มี Extension
SELECT
    j.id as job_id,
    j.service_name,
    j.duration_minutes,
    j.price,
    j.status,
    j.staff_id,
    b.booking_number,
    b.extension_count,
    b.total_extensions_price,
    s.first_name,
    s.last_name
FROM jobs j
LEFT JOIN bookings b ON j.booking_id = b.id
LEFT JOIN staff s ON j.staff_id = s.id
WHERE b.extension_count > 0
ORDER BY b.created_at DESC;

-- ตรวจสอบ booking_services ที่เป็น extension
SELECT
    bs.id,
    bs.booking_id,
    bs.duration,
    bs.price,
    bs.is_extension,
    bs.extended_at,
    b.booking_number,
    j.id as job_id,
    j.service_name,
    j.staff_id
FROM booking_services bs
LEFT JOIN bookings b ON bs.booking_id = b.id
LEFT JOIN jobs j ON j.booking_id = b.id
WHERE bs.is_extension = true
ORDER BY bs.extended_at DESC;