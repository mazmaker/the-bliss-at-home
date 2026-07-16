-- REQUIREMENT (user, 2026-07-16): staff may press "เสร็จสิ้นงาน" ONLY after the booked service
-- duration has fully elapsed — pressing it earlier must be IMPOSSIBLE, not merely hidden.
--
-- Today the ONLY gate is a React hook (apps/staff/src/hooks/useCompleteGate.ts) that sets the
-- button's `disabled` prop. The write itself (packages/supabase/src/jobs/jobService.ts →
-- updateJobStatus) is a plain client-side supabase-js UPDATE with no time check, and prod has NO
-- BEFORE-UPDATE trigger on jobs at all (verified 2026-07-16: jobs carries only
-- notify_other_staff_job_accepted_trigger, sync_job_to_booking_trigger,
-- trigger_update_staff_job_stats — all AFTER, structurally unable to veto). So devtools, a stale
-- bundle, or a crafted PostgREST call completes a job at any time. This trigger is the enforcement.
--
-- Modelled verbatim on the team's own block_nonadmin_cancel_completed (20260703_090000): same
-- SECURITY DEFINER + search_path, same auth.uid()-IS-NULL and ADMIN pass-throughs, same narrow
-- WHEN clause, same P0001 Thai error.
--
-- EXEMPTIONS (deliberate):
--   * auth.uid() IS NULL  → server / service_role. Enforced at the app layer instead.
--   * profiles.role = 'ADMIN' → admin "เสร็จสิ้น" must keep working, including the
--     sync_booking_update_to_job() cascade that fires when an admin completes a BOOKING (that
--     cascade is SECURITY DEFINER but auth.uid() still reads the admin's JWT, so this covers it).
--
-- FAIL-OPEN, per the user's decision (B2, 2026-07-16): block ONLY when we can PROVE the time has
-- not elapsed. Unknown started_at or unknown duration → allow, exactly like the client gate
-- (useCompleteGate.ts:44-47), so an abnormal job is never permanently trapped.
--
-- DATA SAFETY: BEFORE UPDATE **OF status**, and the WHEN clause narrows it further to the single
-- transition into 'completed'. It writes nothing, deletes nothing, and cannot fire on any other
-- column change. Existing rows are only ever affected if someone tries to complete them early —
-- which is precisely the thing being forbidden. Verified 2026-07-16: 0 jobs are 'in_progress'
-- and 0 pending jobs are unassigned, so no in-flight work can be disrupted by applying this.
--
-- ROLLBACK: DROP TRIGGER block_early_job_completion ON public.jobs;

CREATE OR REPLACE FUNCTION public.block_early_job_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_role text;
  v_duration integer;
  v_ends_at timestamptz;
BEGIN
  -- Server-side / service_role (no JWT subject): enforced at the app layer. Let it through.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();

  -- Admins may close a job at any time (support/exception handling, and the admin-completes-booking
  -- cascade sync_booking_update_to_job()).
  IF v_role = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Cannot prove the service started → cannot prove the time has not elapsed → allow (fail-open).
  IF OLD.started_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Same duration source as the client gate: extension-aware, falling back to the base duration.
  v_duration := COALESCE(NEW.total_duration_minutes, NEW.duration_minutes, 0);
  IF v_duration <= 0 THEN
    RETURN NEW;
  END IF;

  -- started_at is a timestamptz written as an absolute UTC instant (jobService.ts:418
  -- `new Date().toISOString()`), and now() is absolute too — this comparison is timezone-safe and
  -- must NOT be rewritten to use scheduled_date/scheduled_time (those are Bangkok wall-clock
  -- strings and would be 7h off on the UTC server).
  v_ends_at := OLD.started_at + make_interval(mins => v_duration);

  IF now() < v_ends_at THEN
    RAISE EXCEPTION 'ยังกดเสร็จสิ้นงานไม่ได้: ต้องรอจนครบเวลาบริการก่อน (เหลืออีก % นาที)',
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_ends_at - now())) / 60))
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS block_early_job_completion ON public.jobs;
CREATE TRIGGER block_early_job_completion
  BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW
  WHEN (NEW.status = 'completed'::job_status AND OLD.status IS DISTINCT FROM 'completed'::job_status)
  EXECUTE FUNCTION public.block_early_job_completion();

COMMENT ON FUNCTION public.block_early_job_completion() IS
  'Rejects a jobs.status -> completed transition before started_at + duration has elapsed. Exempts admin and service_role; fails OPEN when started_at or duration is unknown. Server-side backstop for apps/staff useCompleteGate.';
