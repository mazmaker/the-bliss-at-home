-- ============================================================
-- Fix: Recalculate total_staff_earnings for jobs with extensions
-- Root cause: old code used additive update (+=) instead of
--             recalculating from scratch, causing wrong totals.
-- This migration corrects all affected jobs in place.
-- ============================================================

DO $$
DECLARE
  job_rec   RECORD;
  svc_rec   RECORD;
  ext_rec   RECORD;
  total_ext_earnings  NUMERIC;
  total_ext_duration  INTEGER;
  ext_earning         NUMERIC;
BEGIN
  -- Loop over every active job that has at least one extension
  FOR job_rec IN
    SELECT j.id, j.booking_id, j.staff_earnings, j.duration_minutes
    FROM   jobs j
    WHERE  j.status != 'cancelled'
    AND    EXISTS (
             SELECT 1 FROM booking_services bs
             WHERE  bs.booking_id = j.booking_id
             AND    bs.is_extension = TRUE
           )
  LOOP

    -- Try to get service config via bookings.service_id (direct FK)
    SELECT s.use_fixed_rate,
           s.staff_earning_60,
           s.staff_earning_90,
           s.staff_earning_120,
           s.staff_commission_rate
    INTO   svc_rec
    FROM   bookings b
    JOIN   services s ON s.id = b.service_id
    WHERE  b.id = job_rec.booking_id;

    -- Fallback: get from first original booking_services row
    IF svc_rec IS NULL THEN
      SELECT s.use_fixed_rate,
             s.staff_earning_60,
             s.staff_earning_90,
             s.staff_earning_120,
             s.staff_commission_rate
      INTO   svc_rec
      FROM   booking_services bs
      JOIN   services s ON s.id = bs.service_id
      WHERE  bs.booking_id = job_rec.booking_id
      AND    (bs.is_extension IS NULL OR bs.is_extension = FALSE)
      ORDER  BY bs.sort_order
      LIMIT  1;
    END IF;

    -- Skip if we still can't find service config
    IF svc_rec IS NULL THEN
      RAISE NOTICE 'Skipping job % — no service config found', job_rec.id;
      CONTINUE;
    END IF;

    -- Sum earnings for all extensions of this booking
    total_ext_earnings := 0;
    total_ext_duration := 0;

    FOR ext_rec IN
      SELECT duration, price
      FROM   booking_services
      WHERE  booking_id = job_rec.booking_id
      AND    is_extension = TRUE
    LOOP
      total_ext_duration := total_ext_duration + COALESCE(ext_rec.duration, 0);

      IF svc_rec.use_fixed_rate THEN
        IF ext_rec.duration = 60 THEN
          ext_earning := COALESCE(svc_rec.staff_earning_60, 0);
        ELSIF ext_rec.duration = 120 THEN
          ext_earning := COALESCE(svc_rec.staff_earning_120, 0);
        ELSE
          ext_earning := COALESCE(svc_rec.staff_earning_90, 0);
        END IF;
      ELSE
        ext_earning := ROUND(
          COALESCE(ext_rec.price, 0) * COALESCE(svc_rec.staff_commission_rate, 0)
        );
      END IF;

      total_ext_earnings := total_ext_earnings + ext_earning;
    END LOOP;

    -- Overwrite with correct recalculated values
    UPDATE jobs
    SET    total_staff_earnings  = COALESCE(job_rec.staff_earnings, 0) + total_ext_earnings,
           total_duration_minutes = COALESCE(job_rec.duration_minutes, 0) + total_ext_duration
    WHERE  id = job_rec.id;

    RAISE NOTICE 'Fixed job %: staff_earnings=% + ext=% = total=%, duration=%+%=%',
      job_rec.id,
      job_rec.staff_earnings,
      total_ext_earnings,
      COALESCE(job_rec.staff_earnings, 0) + total_ext_earnings,
      job_rec.duration_minutes,
      total_ext_duration,
      COALESCE(job_rec.duration_minutes, 0) + total_ext_duration;

  END LOOP;

  RAISE NOTICE 'Migration complete: total_staff_earnings recalculated for all jobs with extensions';
END $$;
