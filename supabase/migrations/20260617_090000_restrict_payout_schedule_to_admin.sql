-- Restrict payout_schedule and custom_payout_interval updates to service_role only.
-- Staff can no longer self-service their payout cycle; Admin manages it via the admin app.

-- Drop existing staff UPDATE policy on staff table (allows staff to update their own row freely)
DROP POLICY IF EXISTS "Staff can update own profile" ON staff;
DROP POLICY IF EXISTS "staff_update_own" ON staff;
DROP POLICY IF EXISTS "Staff can update own data" ON staff;

-- Re-create staff UPDATE policy that excludes payout columns
-- Staff can still update non-payout fields (e.g. profile data they own)
-- but cannot touch payout_schedule, custom_payout_interval, next_payout_date, payout_start_date
CREATE POLICY "staff_update_own_non_payout" ON staff
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND payout_schedule = (SELECT payout_schedule FROM staff WHERE id = auth.uid())
    AND custom_payout_interval IS NOT DISTINCT FROM (SELECT custom_payout_interval FROM staff WHERE id = auth.uid())
    AND next_payout_date IS NOT DISTINCT FROM (SELECT next_payout_date FROM staff WHERE id = auth.uid())
    AND payout_start_date IS NOT DISTINCT FROM (SELECT payout_start_date FROM staff WHERE id = auth.uid())
  );
