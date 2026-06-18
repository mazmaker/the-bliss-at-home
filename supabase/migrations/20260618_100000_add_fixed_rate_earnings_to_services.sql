-- Add fixed rate earnings columns to services table
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS use_fixed_rate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_earning_60 NUMERIC,
  ADD COLUMN IF NOT EXISTS staff_earning_90 NUMERIC,
  ADD COLUMN IF NOT EXISTS staff_earning_120 NUMERIC;

-- Update sync_booking_to_job to support fixed rate earnings per service per duration
CREATE OR REPLACE FUNCTION sync_booking_to_job()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- booking already has staff_earnings set manually, use it
    v_total_staff_earnings := NEW.staff_earnings;
  ELSIF v_use_fixed_rate THEN
    -- fixed rate: pick the amount based on booking duration
    v_total_staff_earnings := CASE NEW.duration
      WHEN 60  THEN COALESCE(v_staff_earning_60, 0)
      WHEN 90  THEN COALESCE(v_staff_earning_90, 0)
      WHEN 120 THEN COALESCE(v_staff_earning_120, 0)
      ELSE COALESCE(v_staff_earning_90, COALESCE(v_staff_earning_60, 0))
    END;
  ELSE
    -- commission %: final_price * rate
    v_total_staff_earnings := COALESCE(NEW.final_price, 0) * v_staff_commission_rate;
  END IF;

  v_earnings_per_job := v_total_staff_earnings / v_recipient_count;
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_booking_to_job() IS 'Auto-creates job record(s) when booking is created. Calculates staff_earnings from fixed rate (per duration) or commission % based on service use_fixed_rate setting.';
