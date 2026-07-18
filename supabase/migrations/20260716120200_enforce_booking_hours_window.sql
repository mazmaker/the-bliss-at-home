-- REQUIREMENT (user, 2026-07-16): customer + hotel may only book an appointment that STARTS
-- between 09:00 and 21:00 (Asia/Bangkok). 21:00 is the LAST start — a service may legitimately
-- run past the window (120 min booked at 21:00 ends 23:00, allowed). Admin Quick Booking is
-- EXEMPT (24h). Placing the order is unrestricted for everyone; only the appointment is bounded.
--
-- Before this, NO layer enforced any window: the five hour pickers merely RENDERED options
-- (09:00-23:45 create x3, 09:00-20:00 reschedule x2), the shared validateBookingDate is an
-- EMERGENCY BYPASS stub returning {isValid:true}, and prod has no CHECK/trigger on booking_time.
-- Customer and admin insert into bookings DIRECTLY from the browser, so the app layer alone
-- cannot enforce it — this trigger is the backstop for those two paths.
--
-- EXEMPTIONS (deliberate):
--   * profiles.role = 'ADMIN' → Quick Booking's 24h requirement. This is the ONLY reason the rule
--     cannot be a plain CHECK constraint: the DB must know WHO is writing.
--   * auth.uid() IS NULL → server / service_role. The hotel create path
--     (POST /api/secure-bookings) inserts with the service-role key and is therefore invisible to
--     auth.uid(); it is enforced in Layer A instead — apps/server/src/routes/secure-bookings-v2.ts
--     calls isTimeWithinBookingHours() and rejects with OUTSIDE_BOOKING_HOURS. Same split the team
--     already uses in block_nonadmin_cancel_completed.
--
-- 🛡️ DATA SAFETY — the load-bearing detail. The trigger is BEFORE INSERT OR UPDATE **OF
-- booking_time**, and the body ALSO returns early when an UPDATE leaves booking_time unchanged
-- (`NEW.booking_time IS NOT DISTINCT FROM OLD.booking_time`). Postgres fires an `UPDATE OF col`
-- trigger whenever the column merely APPEARS in the SET list — even set to its own value — so a
-- client that PATCHes a whole row would otherwise re-validate a historical booking and fail. With
-- this guard, an existing row can be cancelled, paid, completed, reassigned or edited freely; it
-- is validated ONLY if someone actually MOVES its time. Nothing is read, rewritten, or deleted.
--
-- Verified on prod 2026-07-16 before writing: exactly ONE of 30 bookings sits outside 09:00-21:00
-- (BK20260704-0622, 2026-07-04 22:15) and it is already CANCELLED; ZERO active bookings are
-- outside the window. So this cannot reject any live row.
--
-- Comparison is TIME-vs-TIME on the Bangkok wall-clock column itself — deliberately no now(),
-- no date arithmetic, no `new Date(date + 'T' + time)` — so the UTC-on-Vercel 7-hour trap that
-- bites this codebase elsewhere cannot apply here.
--
-- ROLLBACK: DROP TRIGGER enforce_booking_hours_window ON public.bookings;

CREATE OR REPLACE FUNCTION public.enforce_booking_hours_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_role text;
BEGIN
  -- Nothing to validate.
  IF NEW.booking_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- An UPDATE that does not actually MOVE the appointment must never be re-validated, or every
  -- historical row outside the window becomes uneditable. This is the guard that protects
  -- existing data.
  IF TG_OP = 'UPDATE' AND NEW.booking_time IS NOT DISTINCT FROM OLD.booking_time THEN
    RETURN NEW;
  END IF;

  -- Server-side / service_role (no JWT subject): the hotel route enforces this in Layer A.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();

  -- Admin Quick Booking is 24h by requirement.
  IF v_role = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF NEW.booking_time < TIME '09:00' OR NEW.booking_time > TIME '21:00' THEN
    RAISE EXCEPTION 'จองบริการได้ระหว่างเวลา 09:00-21:00 น. เท่านั้น (เวลาที่เลือก: %)',
      to_char(NEW.booking_time, 'HH24:MI')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_booking_hours_window ON public.bookings;
CREATE TRIGGER enforce_booking_hours_window
  BEFORE INSERT OR UPDATE OF booking_time ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_hours_window();

COMMENT ON FUNCTION public.enforce_booking_hours_window() IS
  'Rejects a customer/hotel booking whose appointment START is outside 09:00-21:00 (Asia/Bangkok wall-clock). Exempts ADMIN (Quick Booking is 24h) and service_role (hotel route validates in the server). Only validates INSERTs and UPDATEs that actually change booking_time, so historical rows stay editable.';
