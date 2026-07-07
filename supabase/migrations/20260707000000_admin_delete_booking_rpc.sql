-- PART47-P7 — admin_delete_booking(uuid)
-- Hard-delete ONE booking + every related row atomically, recomputing all denormalized
-- counters so every role/module stays consistent.
--
-- Architecture: called DIRECTLY from the admin app via supabase.rpc('admin_delete_booking', {p_booking_id})
-- (the admin app talks to Supabase directly, not through the API server). Security is enforced INSIDE the
-- function: SECURITY DEFINER runs as owner (bypasses RLS to do the cascade) but the FIRST thing it does is
-- check auth.uid()'s profile role = 'ADMIN' (auth.uid() reads the caller's JWT claim via PostgREST), and
-- EXECUTE is granted only to `authenticated` (revoked from public/anon). A non-admin authenticated caller
-- hits FORBIDDEN. search_path pins pg_temp LAST so a caller-planted temp table cannot shadow public tables.
--
-- Decisions locked (D-P7, 2026-07-07):
--   1C hard-delete, no snapshot table (a full logical DB backup is taken before real deletes as the safety net)
--   2B recompute straddling completed payouts (do NOT block)
--   3A deletable in ALL statuses EXCEPT in_progress (hard-block mid-service, mirrors the cancel route)
--   4A a confirm modal gates every delete (client-side)
--
-- FK/footprint model verified live 2026-07-07 (prod rbdvlfriqjnwpxmmgisf) + adversarial audit (4 lenses):
--   NO-ACTION children of bookings (delete FIRST): booking_addons, jobs, point_transactions, transactions
--   CASCADE children of bookings: booking_services, booking_state_transitions, admin_booking_logs,
--     cancellation_notifications, pending_extensions, refund_transactions
--   SET NULL children of bookings: payment_records, reviews
--   CASCADE children of jobs: payout_jobs, staff_journeys, job_ratings, extension_acknowledgments, sent_*
--   SET NULL children of jobs: sos_reports
--   FK-LESS (hand delete/scope): notifications (ids in data JSONB — booking_id/job_id/job_ids[]/new_job_id),
--     promotion_usage (booking_id → recompute promotions.usage_count),
--     sos_alerts (booking_id = a booking id for customer alerts OR a job id for staff alerts)
--   Recompute (no DELETE trigger): staff.total_jobs/total_earnings, payouts.total_jobs/gross_earnings/net_amount,
--     promotions.usage_count, customer_points.total_points/lifetime_earned/lifetime_redeemed/lifetime_expired
--     (+ re-walk point_transactions.balance_after), matching the loyaltyService incremental model
--     (earn/bonus +, redeem -, refund +, expire -).
--   Auto-heal on DELETE (trigger present): customers.total_bookings/total_spent/last_booking_date
--   Reverse-FK to a hand-deleted table: refund_transactions.payment_transaction_id -> transactions = SET NULL (no block)
--   KNOWN LIMITATION (latent — zero hotel bookings on prod): an issued/persisted monthly_bills invoice that
--     already rolled in a deleted hotel booking is NOT recomputed here (issued invoices are treated as
--     immutable financial documents). Revisit if hotel bookings + monthly billing go live.

CREATE OR REPLACE FUNCTION public.admin_delete_booking(p_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_status      text;
  v_cust        uuid;    -- booking's customer_id (for the customer_points recompute; NULL for hotel bookings)
  v_job_ids     uuid[];
  v_affstaff    uuid[];  -- profiles.id of staff on this booking's jobs
  v_affpay      uuid[];  -- payout ids straddling this booking's jobs
  v_affpromo    uuid[];  -- promotion ids whose usage rows we delete
  v_del_jobs    int := 0;
  v_del_notifs  int := 0;
BEGIN
  -- 1) AUTH — caller must be an ADMIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'FORBIDDEN: admin role required (caller role: %)', COALESCE(v_caller_role, '<none>')
      USING ERRCODE = '42501';
  END IF;

  -- 2) Existence + in_progress guard (3A)
  SELECT status, customer_id INTO v_status, v_cust FROM bookings WHERE id = p_booking_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: booking % does not exist', p_booking_id USING ERRCODE = 'P0002';
  END IF;
  IF v_status = 'in_progress' THEN
    RAISE EXCEPTION 'BLOCKED_IN_PROGRESS: cannot delete a booking while the service is in progress'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3) Capture affected sets BEFORE any delete (their rows cascade away)
  SELECT array_agg(j.id),
         array_agg(DISTINCT j.staff_id) FILTER (WHERE j.staff_id IS NOT NULL)
    INTO v_job_ids, v_affstaff
    FROM jobs j WHERE j.booking_id = p_booking_id;
  v_job_ids := COALESCE(v_job_ids, ARRAY[]::uuid[]);

  SELECT array_agg(DISTINCT pj.payout_id) INTO v_affpay
    FROM payout_jobs pj WHERE pj.job_id = ANY(v_job_ids);

  SELECT array_agg(DISTINCT pu.promotion_id) INTO v_affpromo
    FROM promotion_usage pu WHERE pu.booking_id = p_booking_id;

  -- 4) Delete NO-ACTION + FK-less children keyed on the BOOKING (must precede the bookings delete)
  DELETE FROM booking_addons     WHERE booking_id = p_booking_id;  -- NO ACTION
  DELETE FROM point_transactions WHERE booking_id = p_booking_id;  -- NO ACTION (customer_points recomputed in step 11)
  DELETE FROM transactions       WHERE booking_id = p_booking_id;  -- NO ACTION (SET NULLs refund_transactions.payment_transaction_id)
  DELETE FROM promotion_usage    WHERE booking_id = p_booking_id;  -- FK-less
  DELETE FROM sos_alerts         WHERE booking_id = p_booking_id;  -- FK-less (customer-originated alert)

  -- 5) FK-less sos_alerts whose booking_id actually holds one of this booking's JOB ids (staff-originated),
  --    then the jobs (CASCADEs payout_jobs/staff_journeys/sent_*/job_ratings/ext_ack; SET NULL sos_reports)
  IF v_job_ids <> ARRAY[]::uuid[] THEN
    DELETE FROM sos_alerts WHERE booking_id = ANY(v_job_ids);
  END IF;
  DELETE FROM jobs WHERE booking_id = p_booking_id;
  GET DIAGNOSTICS v_del_jobs = ROW_COUNT;

  -- 6) Delete the booking (CASCADEs booking_services/booking_state_transitions/admin_booking_logs/
  --    cancellation_notifications/pending_extensions/refund_transactions; SET NULL payment_records/reviews)
  DELETE FROM bookings WHERE id = p_booking_id;

  -- 7) Scoped delete of notifications (FK-less; ids live in the data JSONB). Cover every shape the app writes:
  --    booking_id, singular job_id, singular new_job_id (reschedule), and the PLURAL job_ids[] array.
  DELETE FROM notifications n
    WHERE n.data->>'booking_id' = p_booking_id::text
       OR n.data->>'job_id'     = ANY (SELECT x::text FROM unnest(v_job_ids) x)
       OR n.data->>'new_job_id' = ANY (SELECT x::text FROM unnest(v_job_ids) x)
       OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(n.data->'job_ids', '[]'::jsonb)) e
            WHERE e = ANY (SELECT x::text FROM unnest(v_job_ids) x)
          );
  GET DIAGNOSTICS v_del_notifs = ROW_COUNT;

  -- 8) RECOMPUTE staff aggregates (jobs has no DELETE trigger)
  IF v_affstaff IS NOT NULL THEN
    UPDATE staff s SET
      total_jobs     = COALESCE((SELECT count(*)              FROM jobs j WHERE j.staff_id = s.profile_id AND j.status = 'completed'), 0),
      total_earnings = COALESCE((SELECT sum(j.staff_earnings) FROM jobs j WHERE j.staff_id = s.profile_id AND j.status = 'completed'), 0)
    WHERE s.profile_id = ANY(v_affstaff);
  END IF;

  -- 9) RECOMPUTE straddling payouts (2B — recompute, not block)
  IF v_affpay IS NOT NULL THEN
    UPDATE payouts p SET
      total_jobs     = COALESCE((SELECT count(*) FROM payout_jobs pj WHERE pj.payout_id = p.id), 0),
      gross_earnings = COALESCE((SELECT sum(j.staff_earnings) FROM payout_jobs pj JOIN jobs j ON j.id = pj.job_id WHERE pj.payout_id = p.id), 0),
      net_amount     = COALESCE((SELECT sum(j.staff_earnings) FROM payout_jobs pj JOIN jobs j ON j.id = pj.job_id WHERE pj.payout_id = p.id), 0) - COALESCE(p.platform_fee, 0)
    WHERE p.id = ANY(v_affpay);
  END IF;

  -- 10) RECOMPUTE promotions.usage_count (trg_increment_promotion_usage is INSERT-only)
  IF v_affpromo IS NOT NULL THEN
    UPDATE promotions pr SET
      usage_count = COALESCE((SELECT count(*) FROM promotion_usage pu WHERE pu.promotion_id = pr.id), 0)
    WHERE pr.id = ANY(v_affpromo);
  END IF;

  -- 11) RECOMPUTE customer_points from the surviving ledger (point_transactions has NO trigger; deleting the
  --     booking's earn/redeem rows leaves the aggregate stale → phantom redeemable points). Mirrors the
  --     loyaltyService incremental model exactly: points sign is +earn/+bonus/-redeem/+refund/-expire, so
  --     total_points = SUM(points); lifetime_earned = SUM over earn+bonus; lifetime_redeemed = -SUM over
  --     redeem+refund; lifetime_expired = -SUM over expire. (v_cust NULL for hotel bookings → no-op.)
  IF v_cust IS NOT NULL THEN
    UPDATE customer_points cp SET
      total_points      = COALESCE((SELECT sum(pt.points) FROM point_transactions pt WHERE pt.customer_id = cp.customer_id), 0),
      lifetime_earned   = COALESCE((SELECT sum(pt.points) FROM point_transactions pt WHERE pt.customer_id = cp.customer_id AND pt.type IN ('earn','bonus')), 0),
      lifetime_redeemed = COALESCE((SELECT -sum(pt.points) FROM point_transactions pt WHERE pt.customer_id = cp.customer_id AND pt.type IN ('redeem','refund')), 0),
      lifetime_expired  = COALESCE((SELECT -sum(pt.points) FROM point_transactions pt WHERE pt.customer_id = cp.customer_id AND pt.type = 'expire'), 0),
      updated_at        = now()
    WHERE cp.customer_id = v_cust;

    -- Re-walk balance_after so the surviving ledger's running-balance column stays monotone (display history).
    UPDATE point_transactions pt SET balance_after = w.running
    FROM (
      SELECT id, sum(points) OVER (ORDER BY created_at, id ROWS UNBOUNDED PRECEDING) AS running
      FROM point_transactions WHERE customer_id = v_cust
    ) w
    WHERE pt.id = w.id;
  END IF;

  -- customers.total_bookings/total_spent/last_booking_date AUTO-HEAL via trg_sync_customer_booking_stats on DELETE

  RETURN json_build_object(
    'deleted_booking',    p_booking_id,
    'deleted_jobs',       v_del_jobs,
    'deleted_notifs',     v_del_notifs,
    'recomputed_staff',   COALESCE(array_length(v_affstaff, 1), 0),
    'recomputed_payouts', COALESCE(array_length(v_affpay, 1), 0),
    'recomputed_promos',  COALESCE(array_length(v_affpromo, 1), 0),
    'recomputed_customer_points', (v_cust IS NOT NULL)
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_booking(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_booking(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.admin_delete_booking(uuid) TO authenticated;
