-- Drop the recipient-blind extension job-totals trigger.
--
-- PROBLEM: trigger_job_totals_on_extension (AFTER INSERT OR UPDATE ON booking_services) wrote
-- jobs.total_duration_minutes / jobs.total_staff_earnings with THREE compounding defects. The
-- live chain was: trigger_update_job_totals_on_extension() -> update_job_totals(job_id) ->
-- calculate_job_totals(job_id).
--
--   1. WRONG JOB. The trigger picked its target with an unordered LIMIT 1:
--          SELECT id INTO affected_job_id FROM jobs WHERE booking_id = NEW.booking_id LIMIT 1;
--      A couple booking has ONE job PER RECIPIENT, so this landed on an arbitrary recipient's job
--      — never mind which recipient actually bought the extension.
--   2. SUMMED ACROSS RECIPIENTS. calculate_job_totals filtered only by booking_id + is_extension:
--          FROM booking_services bs WHERE bs.booking_id = job_booking_id AND bs.is_extension = TRUE
--      with no recipient_index scope, so one job absorbed BOTH recipients' extension minutes.
--   3. HARDCODED 30% COMMISSION. `SUM(bs.price * 0.30)` — it ignored services.staff_commission_rate
--      entirely and has no concept of fixed-rate services.
--
-- IMPACT: total_duration_minutes is what the complete-gate reads (block_early_job_completion() and
-- the staff app's `total_duration_minutes || duration_minutes`), so a wrong value locks the wrong
-- staff member out of "เสร็จสิ้นงาน" for the wrong length of time, and misstates their earnings.
--
-- REPRODUCED ON PROD 2026-07-16 (inside an aborted DO block — nothing committed), booking
-- BK20260707-0692 (couple, 120/120, staff_earnings 900/900):
--   after recipient 1 extends +60/฿800  -> job#1 got 180 min / ฿1,140  (the recipient who did NOT
--                                          extend), job#2 (who did) got NULL
--   after recipient 0 also extends +60  -> job#2 got 240 min / ฿1,410  (120 + BOTH 60s)
--   correct answer for both steps       -> job#1 = 180 and job#2 = 180
-- The unordered LIMIT 1 even picked a DIFFERENT job on the second fire (Postgres moves an updated
-- row in the heap), proving the target is nondeterministic, not merely offset.
--
-- WHY DROP INSTEAD OF FIXING THE FUNCTIONS:
--   1. The server already computes these values correctly, per recipient, on EVERY write path.
--      apps/server/src/services/extensionApplyService.ts:240-259 loops each job, maps
--      recipientIndex = (job.job_index ?? 1) - 1, and writes total_staff_earnings /
--      total_duration_minutes from that recipient's own rows at the service's real rate. Every
--      entry point (customer, hotel, admin confirm, Omise webhook) goes through it. The trigger
--      only ever wrote values the server then overwrote — a last-write-wins race that MASKED the
--      defect, and extensionApplyService's recalc is wrapped in a non-blocking try/catch (:262),
--      so a silent failure there would have left the wrong values in place permanently.
--   2. Teaching the trigger the correct rates would put the earnings rules in a SECOND place and
--      let them drift from the server's. That drift is exactly why prod already carries three
--      rival calculate_job_totals bodies, none matching the repo (see below).
--   3. Verified sole caller: the only object on prod referencing update_job_totals /
--      calculate_job_totals is trigger_update_job_totals_on_extension itself. Dropping its trigger
--      neutralizes the whole chain and orphans nothing.
--
-- FAIL-SAFE: with no writer, total_duration_minutes stays NULL and every consumer already falls
-- back to the per-recipient base — block_early_job_completion() does
-- `COALESCE(NEW.total_duration_minutes, NEW.duration_minutes, 0)` and duration_minutes is set
-- correctly per recipient by set_job_duration_per_recipient (20260716120000). So the failure mode
-- degrades to the correct base duration rather than to a doubled value on the wrong staff member.
--
-- DATA SAFETY: prod had ZERO extension rows when this ran (booking_services WHERE is_extension = 0,
-- jobs with total_duration_minutes = 0 of 32), so no stored value depended on this trigger and
-- nothing needed backfilling. Row counts identical before/after: bookings 30, jobs 32,
-- booking_services 23, profiles 105, staff 66, extension_acknowledgments 0, pending_extensions 0.
--
-- REPO != PROD (recorded for whoever touches these next): the live calculate_job_totals body is
-- NOT the one in 20260325150000_fix_extension_commission_calculation.sql (which JOINs services and
-- uses s.staff_commission_rate/100). Live hardcodes 0.30 with no JOIN — it most likely came from
-- one of the ad-hoc scripts in ui/scripts/sql/fixes/. Separately,
-- 20260513_150000_add_total_staff_earnings_if_not_exists.sql NEVER APPLIED: it declares
-- update_job_totals(p_job_id UUID) with no DROP FUNCTION first, and Postgres rejects a
-- CREATE OR REPLACE that renames an input parameter; prod still has update_job_totals(job_id uuid).
-- Always read the live definition (pg_get_functiondef) before authoring against these.
--
-- The functions are deliberately LEFT IN PLACE so this is reversible with one statement.
--
-- ROLLBACK:
--   CREATE TRIGGER trigger_job_totals_on_extension
--     AFTER INSERT OR UPDATE ON public.booking_services
--     FOR EACH ROW
--     EXECUTE FUNCTION public.trigger_update_job_totals_on_extension();

DROP TRIGGER IF EXISTS trigger_job_totals_on_extension ON public.booking_services;

COMMENT ON FUNCTION public.trigger_update_job_totals_on_extension() IS
  'UNUSED since 20260716220000 — its trigger was dropped. Recipient-blind: targeted an arbitrary job (unordered LIMIT 1) and summed every recipient''s extensions. Per-recipient job totals are owned by the server (extensionApplyService.ts). Do NOT re-attach without fixing recipient scoping first.';

COMMENT ON FUNCTION public.calculate_job_totals(uuid) IS
  'UNUSED since 20260716220000 — sole caller was update_job_totals, itself only reached from the dropped trigger_job_totals_on_extension. Sums booking_services by booking_id with NO recipient_index scope and a hardcoded 0.30 commission that ignores services.staff_commission_rate. Kept only for rollback.';

COMMENT ON FUNCTION public.update_job_totals(uuid) IS
  'UNUSED since 20260716220000 — thin wrapper over calculate_job_totals, reached only from the dropped trigger_job_totals_on_extension. Kept only for rollback.';
