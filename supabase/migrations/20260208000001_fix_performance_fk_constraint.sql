-- ============================================
-- Fix Foreign Key Constraint for staff_performance_metrics
-- ============================================
-- Issue: staff_id references profiles(id) but should reference staff(id)
-- Solution: Drop old constraint and create new one

-- 1. Show current constraint
SELECT 'Current foreign key constraints on staff_performance_metrics:' as info;
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table
FROM pg_constraint
WHERE conrelid = 'staff_performance_metrics'::regclass
  AND contype = 'f';

-- 2. Delete existing performance data (since it has wrong references)
DELETE FROM staff_performance_metrics;
SELECT 'Deleted all performance data' as status;

-- 3. Drop the old foreign key constraint
ALTER TABLE staff_performance_metrics
    DROP CONSTRAINT IF EXISTS staff_performance_metrics_staff_id_fkey;

SELECT 'Dropped old foreign key constraint' as status;

-- 4. Add new foreign key constraint referencing staff(id)
ALTER TABLE staff_performance_metrics
    ADD CONSTRAINT staff_performance_metrics_staff_id_fkey
    FOREIGN KEY (staff_id)
    REFERENCES staff(id)
    ON DELETE CASCADE;

SELECT 'Added new foreign key constraint to staff(id)' as status;

-- 5. Verify new constraint
SELECT 'New foreign key constraints:' as info;
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table
FROM pg_constraint
WHERE conrelid = 'staff_performance_metrics'::regclass
  AND contype = 'f';

-- 6. Now seed performance data with correct staff.id
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
    s.id as staff_id, -- Now correctly uses staff.id
    date_part('year', month_date)::int as year,
    date_part('month', month_date)::int as month,
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

-- 7. Final verification
SELECT 'Final verification - Performance data correctly linked:' as info;
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

SELECT '✅ Foreign key constraint fixed and data re-seeded!' as status;
