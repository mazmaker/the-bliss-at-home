-- ============================================
-- Remove bi_monthly and Change Default to Weekly
-- Date: 2026-06-04 12:00:00
-- Purpose: Remove bi_monthly option and migrate all staff to weekly schedule
-- ============================================

-- 1. Migrate all bi_monthly staff to weekly schedule
UPDATE staff
SET
  payout_schedule = 'weekly',
  next_payout_date = (
    -- Calculate next Monday from current date
    CASE
      WHEN EXTRACT(dow FROM CURRENT_DATE) = 1 THEN CURRENT_DATE + interval '7 days'  -- If Monday, next Monday
      ELSE CURRENT_DATE + interval '1 day' * (8 - EXTRACT(dow FROM CURRENT_DATE))   -- Next Monday
    END
  ),
  payout_start_date = (
    -- Set start date to last Monday
    CASE
      WHEN EXTRACT(dow FROM CURRENT_DATE) = 1 THEN CURRENT_DATE  -- If Monday, today
      ELSE CURRENT_DATE - interval '1 day' * (EXTRACT(dow FROM CURRENT_DATE) - 1)   -- Last Monday
    END
  ),
  updated_at = NOW()
WHERE
  payout_schedule = 'bi_monthly'
  AND is_active = true;

-- 2. Get count of migrated records for verification
DO $$
DECLARE
  migrated_count INTEGER;
  weekly_count INTEGER;
BEGIN
  -- Count staff that were migrated
  SELECT COUNT(*) INTO weekly_count
  FROM staff
  WHERE payout_schedule = 'weekly' AND is_active = true;

  -- Log migration results
  RAISE NOTICE 'Migration completed: % staff now on weekly schedule', weekly_count;

  -- Send notification to all affected staff
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    created_at
  )
  SELECT
    profile_id,
    'รอบการจ่ายเงินได้รับการปรับปรุง',
    'ระบบได้เปลี่ยนรอบการจ่ายเงินเป็นทุกสัปดาห์ (7 วัน) เพื่อให้พนักงานได้รับเงินเร็วขึ้น จ่ายทุกวันจันทร์',
    'info',
    NOW()
  FROM staff
  WHERE payout_schedule = 'weekly' AND is_active = true;

END $$;

-- 3. Store view definition and drop dependent views
DO $$
DECLARE
  view_def TEXT;
BEGIN
  -- Get view definition if it exists
  SELECT pg_get_viewdef('staff_payout_schedule_summary'::regclass::oid, true) INTO view_def;

  -- Store definition in a temporary table for later recreation
  CREATE TEMP TABLE IF NOT EXISTS temp_view_definitions (
    view_name TEXT,
    view_definition TEXT
  );

  INSERT INTO temp_view_definitions (view_name, view_definition)
  VALUES ('staff_payout_schedule_summary', view_def)
  ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN undefined_table THEN
    -- View doesn't exist, continue
    NULL;
END $$;

-- 4. Drop dependent views to allow column type change
DROP VIEW IF EXISTS staff_payout_schedule_summary CASCADE;

-- 5. Remove existing default to allow type change
ALTER TABLE staff
ALTER COLUMN payout_schedule DROP DEFAULT;

-- 6. Create new enum without bi_monthly
DROP TYPE IF EXISTS payout_schedule_enum_new CASCADE;
CREATE TYPE payout_schedule_enum_new AS ENUM ('weekly', 'bi_weekly', 'monthly', 'custom_days');

-- 7. Update staff table to use new enum
ALTER TABLE staff
ALTER COLUMN payout_schedule TYPE payout_schedule_enum_new
USING payout_schedule::text::payout_schedule_enum_new;

-- 8. Drop old enum and rename new one
DROP TYPE IF EXISTS payout_schedule_enum CASCADE;
ALTER TYPE payout_schedule_enum_new RENAME TO payout_schedule_enum;

-- 9. Set new default for future staff
ALTER TABLE staff
ALTER COLUMN payout_schedule SET DEFAULT 'weekly';

-- 10. Recreate views if they existed
DO $$
DECLARE
  view_rec RECORD;
BEGIN
  -- Recreate views from stored definitions
  FOR view_rec IN
    SELECT view_name, view_definition
    FROM temp_view_definitions
    WHERE view_definition IS NOT NULL
  LOOP
    BEGIN
      -- Try to recreate the view, replacing bi_monthly with weekly in case it's hardcoded
      EXECUTE 'CREATE VIEW ' || view_rec.view_name || ' AS ' ||
        REPLACE(view_rec.view_definition, '''bi_monthly''', '''weekly''');

      RAISE NOTICE 'Recreated view: %', view_rec.view_name;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not recreate view %. Error: %', view_rec.view_name, SQLERRM;
    END;
  END LOOP;

  -- Clean up temp table
  DROP TABLE IF EXISTS temp_view_definitions;

EXCEPTION
  WHEN undefined_table THEN
    -- No views to recreate
    NULL;
END $$;

-- 11. Update any existing default constraints
COMMENT ON COLUMN staff.payout_schedule IS 'Staff payout schedule - Default: weekly (7 days)';

-- 12. Verify the migration
SELECT
  payout_schedule,
  COUNT(*) as staff_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM staff
WHERE is_active = true
GROUP BY payout_schedule
ORDER BY staff_count DESC;