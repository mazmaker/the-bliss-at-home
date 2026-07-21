-- /track share link expires when the job is done.
--
-- get_journey_tracking now returns 0 rows once the underlying job is 'completed' or 'cancelled',
-- so the anonymous customer /track/:journeyId page shows "not found / link may have expired"
-- instead of continuing to expose the trip's customer name/phone/address + live GPS after the
-- service is over.
--
-- Keyed on jobs.status (alias j) — NOT staff_journeys.status. staff_journeys rows linger at
-- 'arrived'/'traveling' after the job ends (all 21 journeys on prod at write time sat at a
-- non-terminal journey status while their jobs were 'completed'), so filtering on the journey
-- status would never expire the link. See skill bliss-job-booking-lifecycle-sync.
--
-- Frontend: apps/customer TrackStaff.tsx + StaffTrackingMap.tsx call this RPC with .maybeSingle();
-- 0 rows -> data === null -> throws common:errors.journeyNotFound (localised message now notes the
-- link may have expired because the service is complete). These are the ONLY two callers — no
-- admin/staff/hotel/server consumer (admin live-tracking uses useBookingJourneys, a different path).
--
-- Verified (2026-07-21): abort-test (BEGIN…ROLLBACK) 3/3 — completed→0, in_progress→1, cancelled→0;
-- post-apply, the live function returns 0 rows for a real completed-job journey.
-- Only the WHERE clause changes vs 20260720140000_add_get_journey_tracking_rpc.sql.

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
  WHERE sj.id = p_journey_id
    AND j.status NOT IN ('completed','cancelled');
$function$;

GRANT EXECUTE ON FUNCTION public.get_journey_tracking(uuid) TO anon, authenticated;
