-- Concurrency fix: prevent one staff member from being ASSIGNED two time-overlapping jobs.
--
-- All three assignment write paths (admin assign POST /api/jobs/:id/assign-staff -> assignStaffToJob;
-- staff accept jobService.acceptJob, which UPDATEs jobs client-side under RLS; QuickBooking preassign ->
-- notificationService.processBookingConfirmed -> assignStaffToJob) do JS read-then-write with a single-row
-- compare-and-swap on the TARGET job only. The staff-overlap check is a separate SELECT evaluated in JS, so two
-- concurrent operations both read "no conflict" before either writes (TOCTOU) and one staff ends up double-booked.
-- No DB-level guard existed. This EXCLUSION CONSTRAINT enforces the invariant at the storage layer, covering ALL
-- assign paths at once, with no code change and independent of RLS/service-role.
--
-- 🔴 CRITICAL DESIGN CHOICE — the window uses `duration_minutes` ONLY, NOT COALESCE(total_duration_minutes, ...).
-- This is deliberate and REVERSES an earlier fear (see skill bliss-staff-job-time-overlap 1.0.0/1.1.0, which said
-- "do NOT add a DB EXCLUDE constraint because the extend trigger would break a legitimate extend"). A customer/hotel
-- EXTEND bumps `total_duration_minutes` (trigger trigger_job_totals_on_extension) but leaves `duration_minutes`,
-- `staff_id`, `scheduled_date`, `scheduled_time` UNCHANGED. Because this constraint references none of the columns an
-- extend touches, an extend UPDATE is a HOT update that never re-checks the exclusion index -> extend is NEVER
-- blocked, honoring the owner's "extend must always work" decision. The constraint only fires when an ASSIGN changes
-- staff_id/time into an overlap. Proven on prod 2026-07-20: with the COALESCE(total,...) window an extend-into-the-
-- staff's-next-job raised 23P01 (broke extend); with duration_minutes-only, the same extend is ALLOWED while an
-- overlapping ASSIGN is still BLOCKED.
--
-- Other design notes:
--   * Window = scheduled_date + scheduled_time (Bangkok naive wall-clock) + duration_minutes. tsrange (NOT tstzrange)
--     to match the naive date/time columns and the JS comparison frame. Default [) bounds => back-to-back jobs
--     (a.end == b.start) do NOT overlap, matching findScheduleConflict in jobService.ts / staffEligibilityCheck.ts.
--   * The window expression is IMMUTABLE, so it is inline (no generated column).
--   * Predicate excludes cancelled AND completed to match the JS overlap check.
--   * NO couple exemption needed: couples use two DISTINCT staff_id (verified in prod data), so the
--     `staff_id WITH =` term never matches across a couple's two jobs.
--
-- Verified 2026-07-20 on prod: added cleanly (0 historical overlapping pairs); trigger-isolated abort-test +
-- post-commit re-test -> overlapping ASSIGN raises 23P01, non-overlap OK, EXTEND ALLOWED.
--
-- Follow-up (code): map Postgres 23P01 to a friendly Thai "เวลาทับซ้อน" message in the assign/accept paths
-- (apps/server jobAssignService.ts; packages/supabase jobService.ts). The existing JS overlap checks remain UX
-- pre-filters; this constraint is the hard guarantee for the concurrent race.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_no_staff_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tsrange(
      (scheduled_date + scheduled_time),
      (scheduled_date + scheduled_time) + (duration_minutes * interval '1 minute')
    ) WITH &&
  ) WHERE (staff_id IS NOT NULL AND status NOT IN ('cancelled','completed'));
