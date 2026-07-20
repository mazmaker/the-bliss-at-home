-- Security fix: close the GPS "read-all" leak on staff_journeys + journey_location_updates.
-- Supersedes the over-broad policies installed by 20260518_120000_comprehensive_gps_access_fix.sql.
--
-- BEFORE: staff_journeys_read_all / journey_location_updates_read_all = SELECT TO authenticated USING(true),
--   plus role-wide (ADMIN,STAFF) ALL policies => ANY logged-in user could read every staff member's live
--   GPS location and journey history (21 journeys / 2441 location points exposed to all authenticated users).
--   The customer-scoped policy also joined jobs.customer_id to customers.id (wrong: jobs.customer_id FK ->
--   profiles = auth.uid), so it returned 0 rows and never actually served the customer.
-- AFTER: owner-scoped only — staff sees own (staff.profile_id=auth.uid), customer sees journeys for their
--   own bookings (jobs.customer_id=auth.uid), admin sees all.
--
-- Writes are unaffected: they go through SECURITY DEFINER RPCs (start_staff_journey / update_journey_location /
--   confirm_staff_arrival / complete_staff_journey), which bypass RLS, plus the retained staff-own policy that
--   covers the direct staff UPDATE fallbacks in useGPSTracking.
--
-- Verified 2026-07-20 on prod via an RLS abort-test (BEGIN..ROLLBACK) and again post-commit:
--   non-owner customer -> 0/0 ; owner customer -> 1/63 ; owner staff -> 4/352 ; admin -> 21/2441 ;
--   row counts unchanged (21 journeys / 2441 points). Supabase security advisor: the two tables no longer
--   appear under rls_policy_always_true.
--
-- NOTE: the anonymous customer /track share link (apps/customer TrackStaff.tsx + StaffTrackingMap.tsx) is
--   NOT served by these owner-scoped policies (an anon visitor has no auth.uid()). It was already non-functional
--   for a logged-out visitor before this change; enabling it properly requires a SECURITY DEFINER
--   get_journey_tracking(journey_id) RPC (a separate feature task, tracked with P17/P19).

-- ===== staff_journeys =====
DROP POLICY IF EXISTS "staff_journeys_read_all"        ON public.staff_journeys;
DROP POLICY IF EXISTS "staff_journeys_staff_modify"    ON public.staff_journeys;
DROP POLICY IF EXISTS "staff_journeys_customer_policy" ON public.staff_journeys;
CREATE POLICY "staff_journeys_customer_policy" ON public.staff_journeys
  FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM jobs WHERE customer_id = auth.uid()));
-- retained: staff_journeys_admin_policy (ALL, role=ADMIN) + staff_journeys_staff_policy (ALL, own via staff.profile_id)

-- ===== journey_location_updates =====
DROP POLICY IF EXISTS "journey_location_updates_read_all"     ON public.journey_location_updates;
DROP POLICY IF EXISTS "journey_location_updates_staff_modify" ON public.journey_location_updates;
DROP POLICY IF EXISTS "journey_location_updates_policy"        ON public.journey_location_updates;
CREATE POLICY "journey_location_updates_admin_policy" ON public.journey_location_updates
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "journey_location_updates_staff_policy" ON public.journey_location_updates
  FOR ALL TO authenticated
  USING      (journey_id IN (SELECT sj.id FROM staff_journeys sj JOIN staff s ON s.id = sj.staff_id WHERE s.profile_id = auth.uid()))
  WITH CHECK (journey_id IN (SELECT sj.id FROM staff_journeys sj JOIN staff s ON s.id = sj.staff_id WHERE s.profile_id = auth.uid()));
CREATE POLICY "journey_location_updates_customer_policy" ON public.journey_location_updates
  FOR SELECT TO authenticated
  USING (journey_id IN (SELECT sj.id FROM staff_journeys sj JOIN jobs j ON j.id = sj.booking_id WHERE j.customer_id = auth.uid()));
