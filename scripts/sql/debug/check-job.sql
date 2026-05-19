-- Check specific job details
-- Run this in Supabase SQL Editor

-- Job Overview
SELECT
  'Job Overview' as section,
  id,
  service_name,
  staff_earnings as base_earnings,
  duration_minutes as base_duration,
  total_staff_earnings,
  total_duration_minutes,
  status,
  customer_name
FROM jobs
WHERE id = 'b2884b43-f59e-4756-a463-f9f2106430cc';

-- Extension Details
SELECT
  'Extension Details' as section,
  bs.id as booking_service_id,
  bs.service_id,
  s.name as service_name,
  s.staff_commission_rate,
  bs.price as customer_price,
  bs.duration as extension_duration,
  bs.is_extension,
  bs.created_at as extended_at,
  (bs.price * s.staff_commission_rate) as staff_commission
FROM jobs j
JOIN booking_services bs ON bs.booking_id = j.booking_id
LEFT JOIN services s ON s.id = bs.service_id
WHERE j.id = 'b2884b43-f59e-4756-a463-f9f2106430cc'
ORDER BY bs.sort_order;

-- Summary Calculation
SELECT
  'Summary' as section,
  j.staff_earnings as base_staff_earnings,
  j.duration_minutes as base_duration,
  COALESCE(SUM(CASE WHEN bs.is_extension = TRUE THEN bs.duration ELSE 0 END), 0) as total_extension_duration,
  COALESCE(SUM(CASE WHEN bs.is_extension = TRUE THEN (bs.price * s.staff_commission_rate) ELSE 0 END), 0) as total_extension_commission,
  j.staff_earnings + COALESCE(SUM(CASE WHEN bs.is_extension = TRUE THEN (bs.price * s.staff_commission_rate) ELSE 0 END), 0) as calculated_total_earnings,
  j.duration_minutes + COALESCE(SUM(CASE WHEN bs.is_extension = TRUE THEN bs.duration ELSE 0 END), 0) as calculated_total_duration,
  j.total_staff_earnings as db_total_earnings,
  j.total_duration_minutes as db_total_duration
FROM jobs j
LEFT JOIN booking_services bs ON bs.booking_id = j.booking_id AND bs.is_extension = TRUE
LEFT JOIN services s ON s.id = bs.service_id
WHERE j.id = 'b2884b43-f59e-4756-a463-f9f2106430cc'
GROUP BY j.id, j.staff_earnings, j.duration_minutes, j.total_staff_earnings, j.total_duration_minutes;