-- Module E / C4 fix: let staff read bookings that have a pending (broadcast) job.
--
-- The staff app reads bookings.provider_preference for the jobs offered to a staff
-- member ("งานที่รอมอบหมาย"). Those jobs are pending and unassigned, so bookings.staff_id
-- is still NULL — the existing "Staff can view assigned bookings" policy
-- (staff.id = bookings.staff_id) does NOT match, and the read returns HTTP 406.
-- (Once a staff accepts, sync_job_status_to_booking() sets bookings.staff_id, so the
-- assigned-policy then covers it; this policy only needs to cover the pre-accept read.)
--
-- This adds a SELECT policy: a user who IS staff may read a booking that has at least
-- one pending job. The post-accept / assigned case stays covered by the existing policy.

DROP POLICY IF EXISTS "Staff can view bookings of pending jobs" ON public.bookings;

CREATE POLICY "Staff can view bookings of pending jobs"
ON public.bookings FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM staff s WHERE s.profile_id = auth.uid())
  AND EXISTS (SELECT 1 FROM jobs j WHERE j.booking_id = bookings.id AND j.status = 'pending')
);
