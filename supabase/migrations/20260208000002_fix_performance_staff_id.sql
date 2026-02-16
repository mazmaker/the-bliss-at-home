-- ============================================
-- Fix Performance Data Staff ID
-- ============================================
-- Issue: performance data uses profile_id instead of staff.id
-- Solution: Delete incorrect data and re-seed with correct staff.id

-- 1. Show current incorrect data
SELECT 'Current incorrect performance data:' as info;
SELECT
    spm.staff_id as incorrect_staff_id,
    p.full_name,
    COUNT(*) as record_count
FROM staff_performance_metrics spm
LEFT JOIN profiles p ON p.id = spm.staff_id
GROUP BY spm.staff_id, p.full_name;

-- 2. Delete incorrect performance data
DELETE FROM staff_performance_metrics
WHERE staff_id IN (
    SELECT p.id
    FROM profiles p
    WHERE NOT EXISTS (
        SELECT 1 FROM staff s WHERE s.id = p.id
    )
);

SELECT 'Deleted incorrect performance data' as status;

-- 3. Re-seed with correct staff.id from staff table
INSERT INTO staff_performance_metrics (
    staff_id,
    year,
    month,
    total_jobs,
    completed_jobs,
    cancelled_jobs,
    pending_jobs,
    completion_rate,
    cancel_rate,
    response_rate,
    total_ratings,
    avg_rating,
    total_earnings,
    total_tips,
    performance_score
)
SELECT
    s.id as staff_id, -- Use staff.id, not profile.id
    date_part('year', month_date) as year,
    date_part('month', month_date) as month,
    floor(random() * 16 + 15)::int as total_jobs,
    floor(random() * 16 + 15)::int as completed_jobs,
    floor(random() * 3)::int as cancelled_jobs,
    floor(random() * 3)::int as pending_jobs,
    (88 + random() * 10)::numeric(5,2) as completion_rate,
    (random() * 5)::numeric(5,2) as cancel_rate,
    (85 + random() * 13)::numeric(5,2) as response_rate,
    floor(random() * 16 + 15)::int as total_ratings,
    (4.2 + random() * 0.7)::numeric(3,2) as avg_rating,
    (floor(random() * 10000 + 5000))::numeric(12,2) as total_earnings,
    (floor(random() * 1000))::numeric(12,2) as total_tips,
    (70 + random() * 25)::numeric(5,2) as performance_score
FROM
    staff s
    INNER JOIN profiles p ON p.id = s.profile_id
    CROSS JOIN LATERAL (
        SELECT generate_series(
            date_trunc('month', NOW() - INTERVAL '5 months'),
            date_trunc('month', NOW()),
            '1 month'::interval
        ) as month_date
    ) months
WHERE
    p.role = 'STAFF'
    AND s.status = 'active';

SELECT 'Re-seeded performance data with correct staff.id' as status;

-- 4. Verify the fix
SELECT 'Verification - Performance data now linked correctly:' as info;
SELECT
    spm.staff_id,
    s.name_th as staff_name,
    s.profile_id,
    p.full_name as profile_name,
    COUNT(*) as months_of_data
FROM staff_performance_metrics spm
INNER JOIN staff s ON s.id = spm.staff_id
INNER JOIN profiles p ON p.id = s.profile_id
GROUP BY spm.staff_id, s.name_th, s.profile_id, p.full_name;

SELECT 'Performance data fixed! ✅' as status;
