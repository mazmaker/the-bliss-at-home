-- Rule: once any job of a booking is 'completed' (the staff has earned money),
-- customers / hotels / staff may NOT cancel the booking. Admins still can.
--
-- Layer B (DB backstop). All roles normally cancel via the server /:id/cancel
-- endpoint (service_role → auth.uid() is NULL here), where the role check lives
-- (Layer A). But HOTEL users additionally have direct client UPDATE rights on their
-- own bookings (RLS "Hotels can update own bookings"), so a hotel could cancel
-- straight from the client and bypass the server. This trigger closes that gap:
-- for an authenticated non-admin, block the transition into 'cancelled' when a
-- completed job exists. Server/service_role calls pass through (role enforced there).
--
-- SECURITY DEFINER so it can read jobs regardless of RLS. auth.uid() still reflects
-- the original caller inside a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.block_nonadmin_cancel_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_role text;
BEGIN
  -- Server-side / service_role (no JWT subject): role is enforced at the
  -- /api/bookings/:id/cancel endpoint (Layer A). Let it through here.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();

  -- Admins may always cancel.
  IF v_role = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Non-admin (customer/hotel/staff): block if any job is already completed.
  IF EXISTS (SELECT 1 FROM jobs WHERE booking_id = NEW.id AND status = 'completed') THEN
    RAISE EXCEPTION 'ไม่สามารถยกเลิกได้: มีงานที่ทำเสร็จแล้ว กรุณาติดต่อผู้ดูแลระบบ'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS block_nonadmin_cancel_completed ON public.bookings;
CREATE TRIGGER block_nonadmin_cancel_completed
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION public.block_nonadmin_cancel_completed();
