-- P5 STAGE 1 — atomic customer booking RPC create_booking_with_addons().
--
-- GIT-HYGIENE RECONSTRUCTION (STEP D): reproduces prod migration
-- `20260712070755_p5_stage1_create_booking_with_addons`, applied out-of-band 2026-07-12.
-- Body read faithfully via pg_get_functiondef from live prod.
--
-- WHAT IT DOES: one SECURITY DEFINER transaction that replaces the customer client's separate,
-- partially-error-swallowed insert chain — booking row (pending) + booking_services (one per
-- recipient) + booking_addons (client sends only {addon_id, recipient_index, quantity}; the
-- BEFORE-INSERT trigger snap_booking_addon fills price/total/name from the catalog) + atomic
-- points redemption + promotion_usage. The booking is inserted `pending`, so the paid-flip job
-- trigger fires later, not inside this RPC.
--
-- SECURITY: SECURITY DEFINER bypasses RLS, so it re-checks caller ownership — the booking's
-- customer must belong to auth.uid() (step 0). Duplicate guard (same customer+date+time, not
-- completed/cancelled) raises 23505 DUPLICATE_BOOKING. EXECUTE is locked down to authenticated
-- by the next migration (20260712070847). See the bliss-payment-engine-security skill.
--
-- Rollback: DROP FUNCTION public.create_booking_with_addons(jsonb,jsonb,jsonb,jsonb);

CREATE OR REPLACE FUNCTION public.create_booking_with_addons(p_booking_data jsonb, p_services jsonb, p_addons jsonb DEFAULT '[]'::jsonb, p_points jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid := (p_booking_data->>'customer_id')::uuid;
  v_booking_id uuid;
  v_booking_number text;
  v_primary jsonb;
  v_svc jsonb;
  v_addon jsonb;
  v_existing_number text;
  v_promo_id uuid := NULLIF(p_booking_data->>'promotion_id','')::uuid;
  v_discount_amount numeric := COALESCE((p_booking_data->>'discount_amount')::numeric, 0);
  v_user_id uuid := auth.uid();
  v_points_to_use int;
  v_points_discount numeric;
  v_cp_total int;
  v_cp_redeemed int;
BEGIN
  -- (0) Caller-ownership guard (SECURITY DEFINER bypasses RLS, so re-check here):
  -- the booking's customer must belong to the authenticated caller.
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: customer_id is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM customers c WHERE c.id = v_customer_id AND c.profile_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: booking customer does not belong to the caller';
  END IF;

  -- (1) Duplicate guard: same customer + date + time, not completed/cancelled (race-safe here).
  SELECT booking_number INTO v_existing_number
  FROM bookings
  WHERE customer_id = v_customer_id
    AND booking_date = (p_booking_data->>'booking_date')::date
    AND booking_time = (p_booking_data->>'booking_time')::time
    AND status NOT IN ('completed','cancelled')
  LIMIT 1;
  IF v_existing_number IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_BOOKING:%', v_existing_number USING ERRCODE = '23505';
  END IF;

  -- Primary service = recipient_index 0 (fallback: first element).
  SELECT elem INTO v_primary
  FROM jsonb_array_elements(p_services) elem
  WHERE COALESCE((elem->>'recipient_index')::int, 0) = 0
  LIMIT 1;
  IF v_primary IS NULL THEN
    v_primary := p_services->0;
  END IF;

  -- (2) Booking row. Inserted as pending -> the paid-flip job trigger fires LATER, not now.
  INSERT INTO bookings (
    customer_id, service_id, booking_date, booking_time, duration,
    base_price, final_price, discount_amount, address, latitude, longitude,
    customer_notes, admin_notes, recipient_count, service_format, promotion_id,
    is_multi_service, provider_preference, status, payment_status, payment_method
  ) VALUES (
    v_customer_id,
    (v_primary->>'service_id')::uuid,
    (p_booking_data->>'booking_date')::date,
    (p_booking_data->>'booking_time')::time,
    (v_primary->>'duration')::int,
    (v_primary->>'price')::numeric,
    (p_booking_data->>'final_price')::numeric,
    v_discount_amount,
    NULLIF(p_booking_data->>'address',''),
    (p_booking_data->>'latitude')::numeric,
    (p_booking_data->>'longitude')::numeric,
    NULLIF(p_booking_data->>'customer_notes',''),
    NULLIF(p_booking_data->>'admin_notes',''),
    COALESCE((p_booking_data->>'recipient_count')::int, 1),
    (p_booking_data->>'service_format'),
    v_promo_id,
    (jsonb_array_length(p_services) > 1),
    COALESCE(NULLIF(p_booking_data->>'provider_preference',''), 'no-preference'),
    'pending',
    'pending',
    'other'
  )
  RETURNING id, booking_number INTO v_booking_id, v_booking_number;

  -- (3) booking_services (one row per recipient/service).
  FOR v_svc IN SELECT * FROM jsonb_array_elements(p_services)
  LOOP
    INSERT INTO booking_services (booking_id, service_id, duration, price, recipient_index, recipient_name, sort_order)
    VALUES (
      v_booking_id,
      (v_svc->>'service_id')::uuid,
      (v_svc->>'duration')::int,
      (v_svc->>'price')::numeric,
      COALESCE((v_svc->>'recipient_index')::int, 0),
      NULLIF(v_svc->>'recipient_name',''),
      COALESCE((v_svc->>'sort_order')::int, 0)
    );
  END LOOP;

  -- (4) booking_addons (snap_booking_addon BEFORE-INSERT trigger fills price/total/name from catalog).
  IF p_addons IS NOT NULL AND jsonb_array_length(p_addons) > 0 THEN
    FOR v_addon IN SELECT * FROM jsonb_array_elements(p_addons)
    LOOP
      INSERT INTO booking_addons (booking_id, addon_id, recipient_index, quantity)
      VALUES (
        v_booking_id,
        (v_addon->>'addon_id')::uuid,
        COALESCE((v_addon->>'recipient_index')::int, 0),
        COALESCE((v_addon->>'quantity')::int, 1)
      );
    END LOOP;
  END IF;

  -- (5) Points redemption (atomic here; replaces the client's separate, error-swallowed redeemPoints).
  IF p_points IS NOT NULL THEN
    v_points_to_use  := COALESCE((p_points->>'points_redeemed')::int, 0);
    v_points_discount := COALESCE((p_points->>'points_discount')::numeric, 0);
    IF v_points_to_use > 0 AND v_points_discount > 0 THEN
      SELECT total_points, lifetime_redeemed INTO v_cp_total, v_cp_redeemed
      FROM customer_points WHERE customer_id = v_customer_id;
      IF NOT FOUND THEN
        INSERT INTO customer_points (customer_id) VALUES (v_customer_id)
        RETURNING total_points, lifetime_redeemed INTO v_cp_total, v_cp_redeemed;
      END IF;
      IF v_points_to_use > COALESCE(v_cp_total, 0) THEN
        RAISE EXCEPTION 'INSUFFICIENT_POINTS: have %, need %', COALESCE(v_cp_total,0), v_points_to_use;
      END IF;
      INSERT INTO point_transactions (customer_id, type, points, balance_after, booking_id, description)
      VALUES (v_customer_id, 'redeem', -v_points_to_use, COALESCE(v_cp_total,0) - v_points_to_use,
              v_booking_id, 'ใช้แลกส่วนลด ฿' || v_points_discount);
      UPDATE customer_points
      SET total_points = COALESCE(v_cp_total,0) - v_points_to_use,
          lifetime_redeemed = COALESCE(v_cp_redeemed,0) + v_points_to_use
      WHERE customer_id = v_customer_id;
      UPDATE bookings
      SET points_redeemed = v_points_to_use, points_discount = v_points_discount
      WHERE id = v_booking_id;
    END IF;
  END IF;

  -- (6) promotion_usage (per-user limit enforcement). Mirrors the client's `if (user)` guard.
  IF v_promo_id IS NOT NULL AND v_discount_amount > 0 AND v_user_id IS NOT NULL THEN
    INSERT INTO promotion_usage (promotion_id, user_id, booking_id, discount_amount)
    VALUES (v_promo_id, v_user_id, v_booking_id, v_discount_amount);
  END IF;

  RETURN jsonb_build_object('id', v_booking_id, 'booking_number', v_booking_number);
END;
$function$;
