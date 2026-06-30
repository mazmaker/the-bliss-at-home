-- Fix: couple/simultaneous bookings on FIXED-RATE services under-paid staff.
--
-- ROOT CAUSE: sync_booking_to_job() computed v_total_staff_earnings then divided it by
-- recipient_count for EVERY branch. For the fixed-rate branch, staff_earning_<dur> is a
-- PER-STAFF / PER-SESSION amount (each staff does a full session), so dividing by
-- recipient_count under-paid each staff by a factor of recipient_count.
--   e.g. couple (2 recipients) of a 60-min นวดแผนไทย (staff_earning_60 = 400):
--        before -> each job 400/2 = 200 (total 400)   ← WRONG
--        after  -> each job 400      (total 800)       ← CORRECT
--
-- The division IS correct for the commission-% branch (final_price is the whole-booking
-- total, already scaled by recipients) and for the explicit-staff_earnings branch (treated
-- as a booking total). recipient_count = 1 is unaffected in all branches.
--
-- This migration ONLY rewrites the earnings-computation block to be branch-specific.
-- Everything else (customer/hotel lookup, the per-recipient job INSERT loop, the final
-- bookings.staff_earnings UPDATE) is byte-for-byte unchanged.
--
-- NOTE: this fixes NEW jobs going forward. Historical jobs/bookings already created with the
-- halved value require a separate backfill (not done here).
--
-- ROLLBACK: re-apply the original body (the only diff is the IF/ELSIF/ELSE block below using
-- a single trailing `v_earnings_per_job := v_total_staff_earnings / v_recipient_count;`).

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
BEGIN
  v_recipient_count := COALESCE(NEW.recipient_count, 1);

  SELECT s.name_th, s.name_en, COALESCE(s.staff_commission_rate, 0.6),
         COALESCE(s.use_fixed_rate, false),
         s.staff_earning_60, s.staff_earning_90, s.staff_earning_120
  INTO v_service_name, v_service_name_en, v_staff_commission_rate,
       v_use_fixed_rate, v_staff_earning_60, v_staff_earning_90, v_staff_earning_120
  FROM services s
  WHERE s.id = NEW.service_id;

  IF COALESCE(NEW.staff_earnings, 0) > 0 THEN
    -- Booking already has an explicit staff_earnings: treat it as the booking TOTAL and
    -- split evenly across recipients (UNCHANGED behavior).
    v_total_staff_earnings := NEW.staff_earnings;
    v_earnings_per_job := v_total_staff_earnings / v_recipient_count;
  ELSIF v_use_fixed_rate THEN
    -- FIXED RATE: staff_earning_<dur> is a PER-STAFF / PER-SESSION amount. Each recipient is
    -- served by ONE staff doing a FULL session, so each job earns the full rate (do NOT divide
    -- by recipient_count). Total across the booking = rate * recipient_count.
    v_earnings_per_job := CASE NEW.duration
      WHEN 60  THEN COALESCE(v_staff_earning_60, 0)
      WHEN 90  THEN COALESCE(v_staff_earning_90, 0)
      WHEN 120 THEN COALESCE(v_staff_earning_120, 0)
      ELSE COALESCE(v_staff_earning_90, COALESCE(v_staff_earning_60, 0))
    END;
    v_total_staff_earnings := v_earnings_per_job * v_recipient_count;
  ELSE
    -- COMMISSION %: final_price is the whole-booking total (already scaled by recipients),
    -- so the commission total is split across recipients (UNCHANGED behavior).
    v_total_staff_earnings := COALESCE(NEW.final_price, 0) * v_staff_commission_rate;
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
