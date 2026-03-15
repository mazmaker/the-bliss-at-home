-- ============================================
-- Migration: Seed Staff Performance Mockup Data
-- Date: 2026-02-08
-- Purpose: Generate 6 months of historical performance data
-- ============================================

DO $$
DECLARE
    v_staff_record RECORD;
    v_month_offset INTEGER;
    v_year INTEGER;
    v_month INTEGER;
    v_date DATE;
BEGIN
    -- Loop through all staff members
    FOR v_staff_record IN (
        SELECT id, full_name
        FROM profiles
        WHERE role = 'STAFF'
        AND status = 'active'
    ) LOOP

        RAISE NOTICE 'Generating performance data for staff: %', v_staff_record.full_name;

        -- Generate data for last 6 months
        FOR v_month_offset IN 5..0 LOOP
            -- Calculate year and month
            v_date := CURRENT_DATE - (v_month_offset || ' months')::INTERVAL;
            v_year := EXTRACT(YEAR FROM v_date);
            v_month := EXTRACT(MONTH FROM v_date);

            RAISE NOTICE '  Month: %-%, Jobs being generated...', v_year, v_month;

            -- Insert random performance metrics
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
            VALUES (
                v_staff_record.id,
                v_year,
                v_month,
                -- Generate realistic job counts (varies by month)
                15 + FLOOR(RANDOM() * 15)::INTEGER,  -- 15-30 total jobs
                14 + FLOOR(RANDOM() * 14)::INTEGER,  -- 14-28 completed
                0 + FLOOR(RANDOM() * 3)::INTEGER,    -- 0-2 cancelled
                1 + FLOOR(RANDOM() * 2)::INTEGER,    -- 1-2 pending
                -- Rates (%)
                88.0 + (RANDOM() * 10),              -- 88-98% completion
                1.0 + (RANDOM() * 4),                -- 1-5% cancel
                90.0 + (RANDOM() * 10),              -- 90-100% response
                -- Ratings
                12 + FLOOR(RANDOM() * 15)::INTEGER,  -- 12-27 ratings
                4.2 + (RANDOM() * 0.7),              -- 4.2-4.9 rating
                -- Earnings (THB)
                18000 + (RANDOM() * 12000),          -- 18,000-30,000 THB
                1500 + (RANDOM() * 2500),            -- 1,500-4,000 THB tips
                -- Performance score
                85 + FLOOR(RANDOM() * 13)::INTEGER   -- 85-98 score
            )
            ON CONFLICT (staff_id, year, month) DO NOTHING;

        END LOOP;
    END LOOP;

    RAISE NOTICE 'Performance data generation completed!';
END $$;

-- ============================================
-- Update performance scores based on current month's jobs
-- ============================================
DO $$
DECLARE
    v_staff_record RECORD;
    v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
BEGIN
    -- Recalculate metrics for all staff for current month
    FOR v_staff_record IN (
        SELECT id FROM profiles WHERE role = 'STAFF'
    ) LOOP
        PERFORM calculate_staff_performance(
            v_staff_record.id,
            v_current_year,
            v_current_month
        );
    END LOOP;
END $$;

-- ============================================
-- Verify data was created
-- ============================================
SELECT
    COUNT(*) as total_records,
    COUNT(DISTINCT staff_id) as unique_staff,
    MIN(year || '-' || LPAD(month::TEXT, 2, '0')) as earliest_period,
    MAX(year || '-' || LPAD(month::TEXT, 2, '0')) as latest_period
FROM staff_performance_metrics;

SELECT 'Performance mockup data seeded successfully!' as status;
