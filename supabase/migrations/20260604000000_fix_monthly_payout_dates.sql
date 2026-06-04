-- ============================================
-- Fix Monthly Payout Schedule Logic
-- Date: 2026-06-04
-- Purpose: Reset all monthly staff to payout on 1st of month
-- ============================================

-- 1. Reset all staff with monthly schedule to payout on July 1st, 2026
UPDATE staff
SET
  next_payout_date = '2026-07-01',
  payout_start_date = '2026-06-01',
  updated_at = NOW()
WHERE
  payout_schedule = 'monthly'
  AND is_active = true;

-- 2. Add comment for audit trail
COMMENT ON COLUMN staff.next_payout_date IS 'Next payout date - monthly schedules synchronized to 1st of month';

-- 3. Log the changes for verification
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Get count of updated records
  SELECT COUNT(*) INTO updated_count
  FROM staff
  WHERE payout_schedule = 'monthly'
    AND next_payout_date = '2026-07-01'
    AND is_active = true;

  -- Log to notifications for admin visibility
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
    'ระบบได้ปรับปรุงรอบการจ่ายเงินรายเดือนให้เป็นวันที่ 1 ของทุกเดือน เพื่อความสะดวกในการจัดการ',
    'info',
    NOW()
  FROM staff
  WHERE payout_schedule = 'monthly'
    AND is_active = true;

  -- Raise notice for migration log
  RAISE NOTICE 'Updated % staff members with monthly payout schedule', updated_count;
END $$;

-- 4. Verify the changes
SELECT
  COUNT(*) as total_monthly_staff,
  COUNT(CASE WHEN next_payout_date = '2026-07-01' THEN 1 END) as synchronized_staff
FROM staff
WHERE payout_schedule = 'monthly' AND is_active = true;