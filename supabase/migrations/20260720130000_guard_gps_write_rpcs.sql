-- Security fix (write-integrity): add ownership guards to the two client-callable GPS write RPCs.
-- Found by the adversarial re-check after the 20260720120000 read-leak fix.
--
-- BEFORE: start_staff_journey + update_journey_location were SECURITY DEFINER with NO ownership check
--   (start_staff_journey literally commented "ไม่ต้องเช็คอะไรเลย") and EXECUTE-granted to PUBLIC + anon +
--   authenticated => any caller (even not-logged-in) could forge a journey for someone else's job or overwrite
--   another staff member's live GPS location.
-- AFTER: each RPC verifies the caller (auth.uid()) owns the target job/journey, and EXECUTE is revoked from
--   PUBLIC + anon (the staff app is authenticated; the backend uses service_role).
--
-- The other two GPS write RPCs (complete_staff_journey, confirm_staff_arrival) are already granted only to
--   service_role/postgres (not client-callable), so they are not a client attack surface and are left unchanged.
--
-- Verified 2026-07-20 on prod via an RLS/role abort-test (BEGIN..ROLLBACK) and again post-commit, as real users:
--   owner updates/starts own -> allowed; owner overwrites another staff's journey -> BLOCKED;
--   non-owner customer -> BLOCKED; owner starts another staff's job -> BLOCKED. Grants after:
--   {postgres, authenticated, service_role} (PUBLIC + anon removed).
-- Behavior note: a lapsed-session staff (auth.uid() null) now gets a clear error instead of a silent no-guard
--   write — correct, since a session-less write should not be attributed to a staff member.

CREATE OR REPLACE FUNCTION public.start_staff_journey(p_booking_id uuid, p_staff_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE v_journey_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs j JOIN staff s ON s.id = p_staff_id
                 WHERE j.id = p_booking_id AND j.staff_id = auth.uid() AND s.profile_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized to start this journey' USING ERRCODE = '42501';
  END IF;
  INSERT INTO staff_journeys (booking_id, staff_id, status) VALUES (p_booking_id, p_staff_id, 'traveling')
    RETURNING id INTO v_journey_id;
  UPDATE bookings SET status='traveling', travel_started_at=COALESCE(travel_started_at, now()), updated_at=now()
    WHERE id = p_booking_id;
  RETURN v_journey_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_journey_location(p_journey_id uuid, p_latitude numeric, p_longitude numeric, p_accuracy numeric DEFAULT NULL::numeric)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff_journeys sj JOIN staff s ON s.id = sj.staff_id
                 WHERE sj.id = p_journey_id AND s.profile_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized to update this journey' USING ERRCODE = '42501';
  END IF;
  UPDATE staff_journeys SET current_latitude=p_latitude, current_longitude=p_longitude, last_location_update=now()
    WHERE id = p_journey_id;
  INSERT INTO journey_location_updates (journey_id, latitude, longitude, accuracy)
    VALUES (p_journey_id, p_latitude, p_longitude, p_accuracy);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.start_staff_journey(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_journey_location(uuid,numeric,numeric,numeric) FROM PUBLIC, anon;
