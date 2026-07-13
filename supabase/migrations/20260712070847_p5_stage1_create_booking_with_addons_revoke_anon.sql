-- P5 STAGE 1 — lock down EXECUTE on create_booking_with_addons().
--
-- GIT-HYGIENE RECONSTRUCTION (STEP D): reproduces prod migration
-- `20260712070847_p5_stage1_create_booking_with_addons_revoke_anon`, applied out-of-band
-- 2026-07-12. Reconstructed from the live prod function ACL
-- ({postgres=X, authenticated=X, service_role=X} — no PUBLIC, no anon).
--
-- WHY: a freshly created function grants EXECUTE to PUBLIC by default, which would let the anon
-- role call this SECURITY DEFINER booking RPC. The RPC re-checks caller ownership via auth.uid(),
-- but anon has no uid, so an anon call could only ever error — still, drop the grant so the
-- attack surface matches intent: only authenticated end-users (and service_role) may invoke it.
--
-- Rollback: GRANT EXECUTE ON FUNCTION public.create_booking_with_addons(jsonb,jsonb,jsonb,jsonb) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_booking_with_addons(jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_booking_with_addons(jsonb, jsonb, jsonb, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_booking_with_addons(jsonb, jsonb, jsonb, jsonb) TO authenticated;
