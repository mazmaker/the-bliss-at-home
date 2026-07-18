-- P5 STAGE 1 — per-recipient retail commission in sync_booking_to_job().
--
-- GIT-HYGIENE RECONSTRUCTION (STEP D): reproduces prod migration
-- `20260712062956_p5_stage1_per_recipient_commission`, applied out-of-band 2026-07-12.
-- Body read faithfully via pg_get_functiondef from live prod.
--
-- WHAT CHANGED vs the Phase B version (20260711062206): the COMMISSION-% branch is now
-- PER-RECIPIENT. When booking_services rows exist, each job's earning = that recipient's FULL
-- pre-discount service price (booking_services.price for its recipient_index) * commission rate.
-- Consequences (§1 earnings rule):
--   * Add-ons are excluded (they live in booking_addons, never in booking_services.price).
--   * Discounts are NOT deducted (uses booking_services.price, not final_price) — the platform
--     absorbs customer promo/points AND hotel discount, so staff commission is on retail.
-- The FIXED-RATE branch and the explicit-staff_earnings branch are UNCHANGED. A fallback branch
-- (no booking_services rows) keeps the old booking-level (final_price − add-ons) * rate behavior.
--
-- Rollback: re-apply 20260711062206_p5_phaseB_commission_excludes_addon (the booking-level
-- final_price − add-on commission base).

CREATE OR REPLACE FUNCTION public.sync_booking_to_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_profile_id UUID; v_customer_name TEXT; v_customer_phone TEXT;
  v_service_name TEXT; v_service_name_en TEXT; v_hotel_name TEXT;
  v_recipient_count INTEGER; v_job_index INTEGER;
  v_staff_commission_rate NUMERIC; v_use_fixed_rate BOOLEAN;
  v_staff_earning_60 NUMERIC; v_staff_earning_90 NUMERIC; v_staff_earning_120 NUMERIC;
  v_total_staff_earnings NUMERIC; v_earnings_per_job NUMERIC; v_amount_per_job NUMERIC;
  v_addon_total NUMERIC; v_svc_total NUMERIC; v_svc_i NUMERIC; v_commission_per_recipient BOOLEAN;
BEGIN
  v_recipient_count := COALESCE(NEW.recipient_count, 1);
  SELECT s.name_th, s.name_en, COALESCE(s.staff_commission_rate, 0.6), COALESCE(s.use_fixed_rate, false),
         s.staff_earning_60, s.staff_earning_90, s.staff_earning_120
  INTO v_service_name, v_service_name_en, v_staff_commission_rate, v_use_fixed_rate,
       v_staff_earning_60, v_staff_earning_90, v_staff_earning_120
  FROM services s WHERE s.id = NEW.service_id;
  SELECT COALESCE(SUM(total_price),0) INTO v_addon_total FROM booking_addons WHERE booking_id = NEW.id;
  SELECT COALESCE(SUM(price),0) INTO v_svc_total FROM booking_services WHERE booking_id = NEW.id;
  v_commission_per_recipient := FALSE;
  IF COALESCE(NEW.staff_earnings,0) > 0 THEN
    -- Explicit booking-level staff_earnings: treat as TOTAL, split evenly (UNCHANGED).
    v_total_staff_earnings := NEW.staff_earnings; v_earnings_per_job := v_total_staff_earnings / v_recipient_count;
  ELSIF v_use_fixed_rate THEN
    -- FIXED RATE: per-staff/per-session flat amount; each job earns the full rate (UNCHANGED).
    v_earnings_per_job := CASE NEW.duration WHEN 60 THEN COALESCE(v_staff_earning_60,0)
      WHEN 90 THEN COALESCE(v_staff_earning_90,0) WHEN 120 THEN COALESCE(v_staff_earning_120,0)
      ELSE COALESCE(v_staff_earning_90, COALESCE(v_staff_earning_60,0)) END;
    v_total_staff_earnings := v_earnings_per_job * v_recipient_count;
  ELSIF v_svc_total > 0 THEN
    -- COMMISSION %, PER-RECIPIENT: earning_i = (this recipient's FULL pre-discount service price) * rate.
    -- Add-ons excluded (not in booking_services.price). Discount NOT deducted (uses booking_services.price,
    -- NOT final_price) -- the PLATFORM absorbs the discount. Computed inside the loop below.
    v_commission_per_recipient := TRUE; v_total_staff_earnings := 0;
  ELSE
    -- Fallback (no booking_services rows): booking-level commission on final_price minus add-ons.
    v_total_staff_earnings := GREATEST(COALESCE(NEW.final_price,0) - COALESCE(v_addon_total,0),0) * v_staff_commission_rate;
    v_earnings_per_job := v_total_staff_earnings / v_recipient_count;
  END IF;
  v_amount_per_job := COALESCE(NEW.final_price,0) / v_recipient_count;
  SELECT c.profile_id, c.full_name, c.phone INTO v_customer_profile_id, v_customer_name, v_customer_phone
  FROM customers c WHERE c.id = NEW.customer_id;
  IF NEW.hotel_id IS NOT NULL THEN SELECT h.name_th INTO v_hotel_name FROM hotels h WHERE h.id = NEW.hotel_id; END IF;
  FOR v_job_index IN 1..v_recipient_count LOOP
    IF v_commission_per_recipient THEN
      SELECT COALESCE(SUM(price),0) INTO v_svc_i FROM booking_services WHERE booking_id = NEW.id AND recipient_index = v_job_index - 1;
      v_earnings_per_job := v_svc_i * v_staff_commission_rate;
      v_total_staff_earnings := v_total_staff_earnings + v_earnings_per_job;
    END IF;
    INSERT INTO jobs (booking_id, customer_id, hotel_id, customer_name, customer_phone, hotel_name, room_number,
      address, latitude, longitude, service_name, service_name_en, duration_minutes, scheduled_date, scheduled_time,
      amount, staff_earnings, status, customer_notes, job_index, total_jobs, created_at, updated_at)
    VALUES (NEW.id, v_customer_profile_id, NEW.hotel_id, COALESCE(v_customer_name,'Customer'), v_customer_phone,
      v_hotel_name, NEW.hotel_room_number, COALESCE(NEW.address,''), NEW.latitude, NEW.longitude,
      CASE WHEN v_recipient_count>1 THEN COALESCE(v_service_name,'Service')||' (หมอนวดคนที่ '||v_job_index||'/'||v_recipient_count||')' ELSE COALESCE(v_service_name,'Service') END,
      v_service_name_en, NEW.duration, NEW.booking_date, NEW.booking_time, v_amount_per_job, v_earnings_per_job,
      'pending', NEW.customer_notes, v_job_index, v_recipient_count, NOW(), NOW());
  END LOOP;
  IF COALESCE(NEW.staff_earnings,0) = 0 AND v_total_staff_earnings > 0 THEN
    UPDATE bookings SET staff_earnings = v_total_staff_earnings WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
