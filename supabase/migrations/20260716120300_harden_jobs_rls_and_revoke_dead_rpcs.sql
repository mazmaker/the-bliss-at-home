-- SECURITY HARDENING — two holes found while auditing the complete-gate (2026-07-16).
-- Both are PRE-EXISTING; neither was introduced by the booking-hours / complete-gate work.
--
-- ============================================================================
-- HOLE 1 — any authenticated user can self-assign AND complete an unclaimed job.
-- ============================================================================
-- The LIVE policy (read from prod, NOT from the repo — the repo's DDL in
-- packages/supabase/migrations/20260125_create_jobs_tables.sql describes two policies named
-- "Staff can update their jobs" + "Staff can accept pending jobs" that DO NOT EXIST on prod):
--
--   Staff can update jobs | UPDATE | TO authenticated
--     USING ( staff_id = auth.uid() OR (status = 'pending' AND staff_id IS NULL) )
--     WITH CHECK (none → Postgres reuses USING)
--
-- It never checks that the caller IS staff, and `TO authenticated` covers every customer and
-- hotel JWT the platform issues. One statement satisfies both halves:
--   UPDATE jobs SET staff_id = auth.uid(), status = 'completed' WHERE status='pending' AND staff_id IS NULL;
-- USING passes (row is pending+unassigned), WITH CHECK passes (staff_id is now me). A customer
-- can claim and close a real job. This also lets anyone bypass the new complete-gate trigger's
-- premise by owning a job they were never dispatched.
--
-- FIX: add the missing role gate and nothing else. USING/WITH CHECK keep their existing shape, so
-- genuine staff behaviour (accept a pending job, update your own job) is byte-for-byte unchanged.
--
-- 🛡️ SAFETY — verified on prod before writing: 28 jobs have a staff assigned and **0** of them
-- belong to a profile whose role is not 'STAFF'; the only role holding any job is 'STAFF' (66 such
-- profiles exist, 4 ADMIN). There are 0 unassigned pending jobs in flight. So the role gate cannot
-- lock out a single existing staff member or strand any live job.
-- DROP+CREATE runs inside the migration's implicit transaction: if the CREATE fails the DROP rolls
-- back, so there is no window where jobs has no UPDATE policy.
--
-- ROLLBACK (restores the permissive original verbatim):
--   DROP POLICY "Staff can update jobs" ON public.jobs;
--   CREATE POLICY "Staff can update jobs" ON public.jobs FOR UPDATE TO authenticated
--     USING (staff_id = auth.uid() OR (status = 'pending' AND staff_id IS NULL));

DROP POLICY IF EXISTS "Staff can update jobs" ON public.jobs;

CREATE POLICY "Staff can update jobs" ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'STAFF')
    AND (staff_id = auth.uid() OR (status = 'pending'::job_status AND staff_id IS NULL))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'STAFF')
    AND (staff_id = auth.uid() OR (status = 'pending'::job_status AND staff_id IS NULL))
  );

-- ============================================================================
-- HOLE 2 — three SECURITY DEFINER functions are executable by PUBLIC with no ownership check.
-- ============================================================================
-- prod ACL (read 2026-07-16) for complete_staff_journey / confirm_staff_arrival /
-- start_service_billing was `=X/postgres, postgres=X/postgres, anon=X/postgres,
-- authenticated=X/postgres, service_role=X/postgres` — the leading `=X` is PUBLIC. They are
-- SECURITY DEFINER (RLS bypassed) and take a booking/journey id with no auth.uid() ownership
-- check, e.g. start_service_billing does `UPDATE jobs SET status='in_progress', started_at=now()
-- WHERE booking_id = p_booking_id` for EVERY job on the booking. Resetting started_at is exactly
-- the input the new complete-gate trigger trusts.
--
-- 🛡️ SAFETY — verified before writing: NO application code calls any of the three. Greps across
-- apps/ and packages/ return only the generated database.types.ts entries plus two comments in
-- apps/staff/src/hooks/useGPSTracking.ts that say the opposite of what is true —
-- "ใช้ stopTracking แทน confirm_staff_arrival function ที่ไม่มี" and "ใช้ update_job_status แทน
-- start_service_billing ที่ไม่มี" (the team believed these functions did not exist). They are dead
-- surface. service_role keeps EXECUTE so any future server use still works.
-- REVOKE is metadata-only: it reads and writes no table rows.
--
-- Note the team already uses this exact pattern deliberately elsewhere
-- (20260703120000_get_couple_partner_contact.sql, 20260707000000_admin_delete_booking_rpc.sql).
--
-- Signatures below are the EXACT identity arguments read from prod
-- (pg_get_function_identity_arguments, 2026-07-16) — REVOKE fails on a guessed arity, and two of
-- these three take three arguments, not one.
--
-- ROLLBACK: GRANT EXECUTE ON FUNCTION public.<fn>(<exact args>) TO PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_staff_journey(p_journey_id uuid, p_final_latitude numeric, p_final_longitude numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_staff_arrival(p_booking_id uuid, p_location jsonb, p_photo_url text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.start_service_billing(p_booking_id uuid) FROM PUBLIC, anon, authenticated;
