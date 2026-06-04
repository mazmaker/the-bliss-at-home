-- ============================================
-- Automated Payout Verification Queries
-- Use these in Supabase SQL Editor
-- ============================================

-- 1. ✅ Check recent automated payouts (last 24 hours)
SELECT
  p.id,
  s.name_th as staff_name,
  p.gross_earnings,
  p.total_jobs,
  p.period_start,
  p.period_end,
  p.status,
  p.is_automated,
  p.created_at,
  p.notes
FROM payouts p
JOIN staff st ON st.profile_id = p.staff_id
JOIN profiles s ON s.id = p.staff_id
WHERE p.is_automated = true
  AND p.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY p.created_at DESC;

-- 2. 📊 Automated payout stats by date
SELECT
  DATE(created_at) as payout_date,
  COUNT(*) as total_payouts,
  SUM(gross_earnings) as total_amount,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
FROM payouts
WHERE is_automated = true
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY payout_date DESC;

-- 3. 👥 Staff next payout dates (who's due today/tomorrow)
SELECT
  s.name_th,
  st.payout_schedule,
  st.next_payout_date,
  st.last_payout_processed_at,
  CASE
    WHEN st.next_payout_date = CURRENT_DATE THEN '🔴 Due Today!'
    WHEN st.next_payout_date = CURRENT_DATE + INTERVAL '1 day' THEN '🟡 Due Tomorrow'
    ELSE CAST(st.next_payout_date - CURRENT_DATE AS text) || ' days left'
  END as status
FROM staff st
JOIN profiles s ON s.id = st.profile_id
WHERE st.is_active = true
  AND st.next_payout_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY st.next_payout_date ASC;

-- 4. 🔍 Detailed payout breakdown for specific staff
-- Replace 'STAFF_NAME' with actual staff name
SELECT
  p.id,
  p.period_start,
  p.period_end,
  p.gross_earnings,
  p.total_jobs,
  p.status,
  p.is_automated,
  p.created_at,
  -- Show related jobs
  (
    SELECT COUNT(*)
    FROM payout_jobs pj
    WHERE pj.payout_id = p.id
  ) as linked_jobs_count
FROM payouts p
JOIN staff st ON st.profile_id = p.staff_id
JOIN profiles s ON s.id = p.staff_id
WHERE s.full_name ILIKE '%STAFF_NAME%'
  OR st.name_th ILIKE '%STAFF_NAME%'
ORDER BY p.created_at DESC
LIMIT 10;

-- 5. 🚨 Potential issues check
SELECT
  'Missing bank accounts' as issue_type,
  COUNT(*) as staff_count
FROM staff st
LEFT JOIN bank_accounts ba ON ba.staff_id = st.id
WHERE st.is_active = true
  AND ba.id IS NULL

UNION ALL

SELECT
  'No next payout date' as issue_type,
  COUNT(*) as staff_count
FROM staff
WHERE is_active = true
  AND next_payout_date IS NULL

UNION ALL

SELECT
  'Overdue payouts (>7 days)' as issue_type,
  COUNT(*) as staff_count
FROM staff
WHERE is_active = true
  AND next_payout_date < CURRENT_DATE - INTERVAL '7 days';

-- 6. 📈 Performance stats - automated vs manual
SELECT
  is_automated,
  COUNT(*) as payout_count,
  AVG(gross_earnings) as avg_amount,
  SUM(gross_earnings) as total_amount,
  AVG(total_jobs) as avg_jobs_per_payout
FROM payouts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY is_automated;

-- 7. 📅 Upcoming payouts (next 7 days)
SELECT
  st.next_payout_date,
  COUNT(*) as staff_count,
  STRING_AGG(s.full_name, ', ') as staff_names
FROM staff st
JOIN profiles s ON s.id = st.profile_id
WHERE st.is_active = true
  AND st.next_payout_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
GROUP BY st.next_payout_date
ORDER BY st.next_payout_date;

-- 8. 🔎 Last automation run log (check if system is working)
SELECT
  COUNT(*) as payouts_created_today,
  MAX(created_at) as latest_automated_payout,
  MIN(created_at) as earliest_automated_payout_today
FROM payouts
WHERE is_automated = true
  AND DATE(created_at) = CURRENT_DATE;