-- P5 STAGE 0 — pin search_path on snap_booking_addon().
--
-- GIT-HYGIENE RECONSTRUCTION (STEP D): reproduces prod migration
-- `20260712040752_p5_stage0_snap_addon_search_path`, applied out-of-band 2026-07-12.
-- Content read faithfully from the live prod function definition (the trigger function now
-- carries `SET search_path TO 'public', 'pg_temp'`).
--
-- WHY: pinning search_path on a SECURITY-relevant trigger function is a Supabase advisor
-- hardening (function_search_path_mutable) — it prevents a caller-controlled search_path from
-- resolving the unqualified object references to attacker tables. snap_booking_addon() already
-- schema-qualifies public.service_addons, so this is defense-in-depth.
--
-- Rollback: ALTER FUNCTION public.snap_booking_addon() RESET search_path;

ALTER FUNCTION public.snap_booking_addon() SET search_path TO 'public', 'pg_temp';
