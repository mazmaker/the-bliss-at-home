-- Recipient-aware DB backstop for jobs.total_duration_minutes on extension.
--
-- WHY THIS EXISTS: 20260716220000 dropped trigger_job_totals_on_extension because it was
-- recipient-blind (arbitrary job via unordered LIMIT 1, summed across recipients, hardcoded 0.30
-- commission). That was right for COUPLE bookings, but it removed a backstop that was actually
-- CORRECT for the SINGLE-recipient case, which is the majority (26 of 30 prod bookings).
--
-- Proved empirically on prod 2026-07-16 (aborted DO block, nothing committed) — BK20260706-0643,
-- single recipient, base 60 min, +60 extension, correct answer 120:
--     with the old trigger : total_duration_minutes = 120   <- correct
--     after the drop       : total_duration_minutes = NULL
-- With one job, `LIMIT 1` has nothing to pick wrongly and "sum of all recipients" IS that
-- recipient's own sum — so defects 1 and 2 of the old trigger only ever bit couples. Only its
-- earnings math was wrong for singles.
--
-- WHY IT MATTERS: total_duration_minutes is written ONLY by the server's extend apply
-- (apps/server/src/services/extensionApplyService.ts:256-259, and payment.ts:174-181 for the Omise
-- path). Both recalcs sit in NON-BLOCKING try/catch blocks (extensionApplyService.ts:262-264,
-- payment.ts:271-273) with no retry, no reconciliation, and the route still returns success. So a
-- transient failure there (a services select 5xx, a function timeout mid-loop) leaves the column
-- NULL forever, and every consumer COALESCEs to the BASE duration — letting staff close a paid-for
-- 120+60 job at minute 120, and under-reporting the extension's earnings. This trigger is the
-- transactional backstop for exactly that window: it fires inside the same INSERT, so it cannot
-- silently not-run.
--
-- SAME FORMULA AS THE SERVER, deliberately, so the two can never disagree:
--     extensionApplyService.ts:258 -> Number(job.duration_minutes ?? 0) + jobExtDuration
--     here                         -> COALESCE(j.duration_minutes, 0) + <this recipient's exts>
-- jobs.duration_minutes is the per-recipient BASE (set_job_duration_per_recipient, 20260716120000)
-- and is never bumped by extensions — that is total_duration_minutes' job.
--
-- DURATION ONLY, NEVER EARNINGS. The earnings rules (use_fixed_rate vs staff_commission_rate, the
-- per-recipient service rate) live in the server and must stay in exactly one place. Duplicating
-- them into SQL is what produced three rival calculate_job_totals bodies, none matching the repo.
-- total_staff_earnings therefore stays server-owned and is NOT touched here.
--
-- FAIL-SAFE: it only ever writes when this recipient HAS extension rows (v_ext_duration > 0), so a
-- job with no extension keeps total_duration_minutes NULL and consumers keep COALESCEing to
-- duration_minutes — preserving today's convention (0 of 32 prod jobs populated). If no job matches
-- the recipient, 0 rows update and the column stays NULL: it can only ever add a correct value,
-- never blank or corrupt one.
--
-- ROLLBACK: DROP TRIGGER set_job_total_duration_on_extension ON public.booking_services;

CREATE OR REPLACE FUNCTION public.set_job_total_duration_on_extension()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_recipient    integer;
  v_ext_duration integer;
BEGIN
  -- Defensive: the trigger already carries WHEN (NEW.is_extension IS TRUE), but keep the guard so a
  -- future re-attach without that clause cannot make this fire on base rows.
  IF COALESCE(NEW.is_extension, FALSE) IS NOT TRUE OR NEW.booking_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_recipient := COALESCE(NEW.recipient_index, 0);

  -- This recipient's OWN extension minutes (recompute from scratch — idempotent, so an UPDATE or a
  -- re-fire can never double-count the way an `x = x + NEW.duration` increment would).
  SELECT COALESCE(SUM(bs.duration), 0)
    INTO v_ext_duration
  FROM booking_services bs
  WHERE bs.booking_id = NEW.booking_id
    AND COALESCE(bs.recipient_index, 0) = v_recipient
    AND COALESCE(bs.is_extension, FALSE) = TRUE;

  IF v_ext_duration <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE jobs j
     SET total_duration_minutes = COALESCE(j.duration_minutes, 0) + v_ext_duration,
         updated_at = NOW()
   WHERE j.booking_id = NEW.booking_id
     -- jobs.status is the ENUM job_status (pending|assigned|confirmed|traveling|arrived|
     -- in_progress|completed|cancelled), NOT text — `COALESCE(j.status,'')` raises
     -- `22P02 invalid input value for enum job_status: ""` and, from an AFTER INSERT trigger,
     -- that aborts the whole extension INSERT. IS DISTINCT FROM keeps NULL-status jobs included.
     AND j.status IS DISTINCT FROM 'cancelled'::job_status
     AND (
           -- Couple: ONLY this recipient's job. The documented mapping is
           -- recipient_index = job_index - 1 (StaffJobDetail.tsx, set_job_duration_per_recipient).
           (COALESCE(j.total_jobs, 1) > 1 AND j.job_index = v_recipient + 1)
           -- Single: the one job. Legacy rows may carry a null recipient_index, hence the COALESCE
           -- above rather than a recipient match here.
        OR COALESCE(j.total_jobs, 1) <= 1
         );

  RETURN NULL;  -- AFTER trigger: return value is ignored
END;
$function$;

DROP TRIGGER IF EXISTS set_job_total_duration_on_extension ON public.booking_services;
CREATE TRIGGER set_job_total_duration_on_extension
  AFTER INSERT OR UPDATE ON public.booking_services
  FOR EACH ROW
  WHEN (NEW.is_extension IS TRUE)
  EXECUTE FUNCTION public.set_job_total_duration_on_extension();

COMMENT ON FUNCTION public.set_job_total_duration_on_extension() IS
  'Extension backstop: sets jobs.total_duration_minutes = the job''s own base duration_minutes + THIS recipient''s own extension minutes (couple: job_index = recipient_index+1). Mirrors extensionApplyService.ts:258 exactly so the server and the DB can never disagree. Duration only — earnings stay server-owned on purpose. Replaces the recipient-blind trigger_job_totals_on_extension dropped in 20260716220000.';
