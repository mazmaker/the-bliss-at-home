-- ============================================================
-- Fix: recipient-aware extension acknowledgment
-- ============================================================
-- The extension-acknowledgment trigger previously grabbed ANY active job for
-- the booking (LIMIT 1), so for a COUPLE/simultaneous booking an extension on
-- recipient B could be acknowledged against recipient A's job. This makes it
-- recipient-aware: match the job whose job_index = recipient_index + 1, with a
-- fallback to the prior single/legacy behavior when no recipient-specific job
-- exists.
--
-- Applied to prod (rbdvlfriqjnwpxmmgisf) via MCP on 2026-07-08; this file keeps
-- git in sync with prod (see RESUME 2026-07-09 §0/§2).

CREATE OR REPLACE FUNCTION public.create_extension_acknowledgment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  target_job_id UUID;
  target_staff_profile_id UUID;
BEGIN
  IF NEW.is_extension = TRUE THEN
    -- (1) recipient-aware: the job for THIS recipient (job_index = recipient_index + 1)
    SELECT j.id, j.staff_id INTO target_job_id, target_staff_profile_id
    FROM jobs j
    WHERE j.booking_id = NEW.booking_id
      AND j.job_index = COALESCE(NEW.recipient_index, 0) + 1
      AND j.status IN ('assigned','confirmed','traveling','arrived','in_progress')
    LIMIT 1;

    -- (2) fallback: no recipient-specific match (single/legacy) -> prior behavior
    IF target_staff_profile_id IS NULL THEN
      SELECT j.id, j.staff_id INTO target_job_id, target_staff_profile_id
      FROM jobs j
      WHERE j.booking_id = NEW.booking_id
        AND j.status IN ('assigned','confirmed','traveling','arrived','in_progress')
      LIMIT 1;
    END IF;

    IF target_staff_profile_id IS NOT NULL THEN
      INSERT INTO extension_acknowledgments (staff_profile_id, booking_service_id, job_id)
      VALUES (target_staff_profile_id, NEW.id, target_job_id)
      ON CONFLICT (staff_profile_id, booking_service_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
