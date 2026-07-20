-- Feature: get_journey_tracking(p_journey_id) — a SECURITY DEFINER read RPC that lets the anonymous customer
-- "share tracking link" page (/track/:journeyId) render without logging in, now that the owner-scoped RLS
-- policies (20260720120000) correctly deny direct anon reads of staff_journeys.
--
-- The journey UUID is the bearer capability (unguessable). The RPC resolves the id-space correctly
-- (staff_journeys.booking_id is a JOB id -> jobs) and returns the REAL destination coords from jobs.latitude/
-- longitude (the client previously hardcoded 13.75471599 / 100.49688619). Granted to anon + authenticated.
--
-- Verified 2026-07-20: called as role `anon` for a real journey it returns a complete payload (journey status +
-- live GPS + service/customer + real destination coords + staff_name).
--
-- Consumers (client rewired to call this instead of direct table reads): apps/customer TrackStaff.tsx +
-- StaffTrackingMap.tsx. Live position on the anon page refreshes by POLLING this RPC (~15s) because Realtime
-- postgres_changes enforces RLS and delivers nothing to an anon subscriber.
--
-- Privacy note: anyone holding the (unguessable) journey UUID can read the trip's customer name/phone/address +
-- staff name + live GPS — the standard "share your tracking link" model. Tighten later if desired (e.g. hide
-- phone, or restrict to status IN ('traveling','arrived')).

CREATE OR REPLACE FUNCTION public.get_journey_tracking(p_journey_id uuid)
 RETURNS TABLE(
   id uuid, status text, started_at timestamptz,
   current_latitude numeric, current_longitude numeric, last_location_update timestamptz,
   service_name text, customer_name text, customer_phone text, duration_minutes integer,
   hotel_name text, room_number text, address text,
   destination_lat double precision, destination_lng double precision, destination_name text,
   staff_name text
 ) LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
  SELECT
    sj.id, sj.status, sj.started_at,
    sj.current_latitude, sj.current_longitude, sj.last_location_update,
    j.service_name, j.customer_name, j.customer_phone, j.duration_minutes,
    j.hotel_name, j.room_number, j.address,
    j.latitude, j.longitude,
    COALESCE(NULLIF(TRIM(COALESCE(j.hotel_name,'') || COALESCE(' ห้อง ' || j.room_number, '')), ''), j.address) AS destination_name,
    COALESCE(p.full_name, s.name_th, s.name_en) AS staff_name
  FROM staff_journeys sj
  JOIN jobs j ON j.id = sj.booking_id
  LEFT JOIN staff s ON s.id = sj.staff_id
  LEFT JOIN profiles p ON p.id = s.profile_id
  WHERE sj.id = p_journey_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_journey_tracking(uuid) TO anon, authenticated;
