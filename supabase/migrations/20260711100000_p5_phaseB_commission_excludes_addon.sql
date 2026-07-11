-- P5 Phase B: staff commission must EXCLUDE add-on sales.
--
-- ROOT CAUSE: add-on price is folded into bookings.final_price (customer BookingWizard:
-- subtotal = service price + add-on price). sync_booking_to_job()'s COMMISSION branch
-- computes v_total_staff_earnings := final_price * staff_commission_rate, so staff
-- commission wrongly includes add-on money. (Requirement: add-ons must NOT be paid as
-- staff commission.)
--
-- FIX: subtract the booking's add-on total (SUM(booking_addons.total_price)) from the
-- COMMISSION base only, floored at 0 (a large promo/points discount could otherwise push
-- the service portion negative). The FIXED-RATE branch (never reads final_price) and the
-- explicit-staff_earnings branch are UNCHANGED. v_amount_per_job (the customer-facing
-- per-job price) is UNCHANGED — it still reflects the full final_price incl. add-on, so
-- what the customer pays / what admin shows as revenue does not move.
--
-- COUPLE/SIMULTANEOUS: the add-on total is subtracted at the BOOKING level before the
-- /recipient_count split (booking_addons has no recipient_index yet; per-recipient add-on
-- precision is Phase D). recipient_count = 1 is unchanged in shape.
--
-- NO BACKFILL NEEDED: booking_addons has 0 rows at apply time (verified on prod) — this is
-- a forward-only fix; no historical jobs/bookings carry add-on-inflated commission.
--
-- APP-SIDE PARITY: the paired duplicate (packages/supabase/src/jobs/jobService.ts
-- updateJobStatus() completion safety-net commission branch) is fixed in lockstep in the
-- SAME commit so app and DB compute the identical add-on-excluded commission base.
--
-- DEFERRED (P5+P6 merge, display-only): the reschedule LINE-notification recompute
-- (server/routes/bookings.ts /:id/reschedule) still shows an add-on-inflated รายได้; it is
-- display-only (no persisted earning) and lives inside P6's reschedule-route footprint, so
-- it is fixed when P5+P6 land together (see the p5-p6-branch-merge-collision-map memory).
--
-- ROLLBACK: re-apply 20260630120000_fix_couple_fixed_rate_staff_earnings (drop the
-- v_addon_total declaration + its SELECT and revert the commission line to
-- `final_price * staff_commission_rate`).

CREATE OR REPLACE FUNCTION public.sync_booking_to_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_profile_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_service_name TEXT;
  v_service_name_en TEXT;
  v_hotel_name TEXT;
  v_recipient_count INTEGER;
  v_job_index INTEGER;
  v_staff_commission_rate NUMERIC;
  v_use_fixed_rate BOOLEAN;
  v_staff_earning_60 NUMERIC;
  v_staff_earning_90 NUMERIC;
  v_staff_earning_120 NUMERIC;
  v_total_staff_earnings NUMERIC;
  v_earnings_per_job NUMERIC;
  v_amount_per_job NUMERIC;
  v_addon_total NUMERIC;
BEGIN
  v_recipient_count := COALESCE(NEW.recipient_count, 1);

  SELECT s.name_th, s.name_en, COALESCE(s.staff_commission_rate, 0.6),
         COALESCE(s.use_fixed_rate, false),
         s.staff_earning_60, s.staff_earning_90, s.staff_earning_120
  INTO v_service_name, v_service_name_en, v_staff_commission_rate,
       v_use_fixed_rate, v_staff_earning_60, v_staff_earning_90, v_staff_earning_120
  FROM services s
  WHERE s.id = NEW.service_id;

  -- P5 Phase B: total add-on money on this booking (excluded from the commission base below).
  SELECT COALESCE(SUM(total_price), 0) INTO v_addon_total
  FROM booking_addons
  WHERE booking_id = NEW.id;

  IF COALESCE(NEW.staff_earnings, 0) > 0 THEN
    -- Booking already has an explicit staff_earnings: treat it as the booking TOTAL and
    -- split evenly across recipients (UNCHANGED behavior).
    v_total_staff_earnings := NEW.staff_earnings;
    v_earnings_per_job := v_total_staff_earnings / v_recipient_count;
  ELSIF v_use_fixed_rate THEN
    -- FIXED RATE: staff_earning_<dur> is a PER-STAFF / PER-SESSION amount. Each recipient is
    -- served by ONE staff doing a FULL session, so each job earns the full rate (do NOT divide
    -- by recipient_count). Total across the booking = rate * recipient_count. (UNCHANGED; does
    -- NOT read final_price, so add-ons never affect fixed-rate earnings.)
    v_earnings_per_job := CASE NEW.duration
      WHEN 60  THEN COALESCE(v_staff_earning_60, 0)
      WHEN 90  THEN COALESCE(v_staff_earning_90, 0)
      WHEN 120 THEN COALESCE(v_staff_earning_120, 0)
      ELSE COALESCE(v_staff_earning_90, COALESCE(v_staff_earning_60, 0))
    END;
    v_total_staff_earnings := v_earnings_per_job * v_recipient_count;
  ELSE
    -- COMMISSION %: final_price is the whole-booking total (already scaled by recipients) AND
    -- includes add-on money, so subtract the add-on total before applying the commission rate
    -- (P5 Phase B: add-ons must NOT be paid as staff commission). Floored at 0 so a large
    -- discount cannot produce a negative base. Then split across recipients (UNCHANGED split).
    v_total_staff_earnings := GREATEST(COALESCE(NEW.final_price, 0) - COALESCE(v_addon_total, 0), 0) * v_staff_commission_rate;
    v_earnings_per_job := v_total_staff_earnings / v_recipient_count;
  END IF;

  v_amount_per_job := COALESCE(NEW.final_price, 0) / v_recipient_count;

  SELECT c.profile_id, c.full_name, c.phone
  INTO v_customer_profile_id, v_customer_name, v_customer_phone
  FROM customers c
  WHERE c.id = NEW.customer_id;

  IF NEW.hotel_id IS NOT NULL THEN
    SELECT h.name_th INTO v_hotel_name
    FROM hotels h
    WHERE h.id = NEW.hotel_id;
  END IF;

  FOR v_job_index IN 1..v_recipient_count LOOP
    INSERT INTO jobs (
      booking_id, customer_id, hotel_id, customer_name, customer_phone,
      hotel_name, room_number, address, latitude, longitude,
      service_name, service_name_en, duration_minutes, scheduled_date,
      scheduled_time, amount, staff_earnings, status, customer_notes,
      job_index, total_jobs, created_at, updated_at
    ) VALUES (
      NEW.id, v_customer_profile_id, NEW.hotel_id,
      COALESCE(v_customer_name, 'Customer'), v_customer_phone,
      v_hotel_name, NEW.hotel_room_number, COALESCE(NEW.address, ''),
      NEW.latitude, NEW.longitude,
      CASE
        WHEN v_recipient_count > 1 THEN
          COALESCE(v_service_name, 'Service') || ' (หมอนวดคนที่ ' || v_job_index || '/' || v_recipient_count || ')'
        ELSE
          COALESCE(v_service_name, 'Service')
      END,
      v_service_name_en, NEW.duration, NEW.booking_date, NEW.booking_time,
      v_amount_per_job, v_earnings_per_job, 'pending', NEW.customer_notes,
      v_job_index, v_recipient_count, NOW(), NOW()
    );
  END LOOP;

  IF COALESCE(NEW.staff_earnings, 0) = 0 AND v_total_staff_earnings > 0 THEN
    UPDATE bookings SET staff_earnings = v_total_staff_earnings WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
