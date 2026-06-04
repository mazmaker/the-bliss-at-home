-- ============================================
-- Add Automated Payout Support
-- Date: 2026-06-04 13:00:00
-- Purpose: Add support for automated payout generation
-- ============================================

-- 1. Add is_automated column to payouts table
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false;

-- 2. Add total_hours column for better tracking
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;

-- 3. Add index for automated payouts
CREATE INDEX IF NOT EXISTS idx_payouts_automated ON payouts(is_automated, created_at);
CREATE INDEX IF NOT EXISTS idx_payouts_staff_automated ON payouts(staff_id, is_automated, status);

-- 4. Update RLS policies to include automated payouts
-- Staff can see their own automated payouts
CREATE POLICY IF NOT EXISTS "Staff can view own automated payouts"
ON payouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.profile_id = auth.uid()
    AND staff.profile_id = payouts.staff_id
  )
);

-- 5. Add comments for documentation
COMMENT ON COLUMN payouts.is_automated IS 'True if this payout was generated automatically by the system';
COMMENT ON COLUMN payouts.total_hours IS 'Total hours worked in this payout period';

-- 6. Update existing manual payouts
UPDATE payouts
SET is_automated = false
WHERE is_automated IS NULL;

-- 7. Set NOT NULL constraint after updating
ALTER TABLE payouts
ALTER COLUMN is_automated SET NOT NULL;

-- 8. Verify the changes
SELECT
  is_automated,
  COUNT(*) as payout_count,
  SUM(gross_earnings) as total_amount
FROM payouts
GROUP BY is_automated;