-- แก้ไข Trigger ให้การจองใหม่ทำงานอัตโนมัติ
-- รองรับทั้ง Hotel App และ Customer App
-- รันใน Supabase SQL Editor: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql

-- 1. ลบ Trigger และ Function เก่า
DROP TRIGGER IF EXISTS create_extension_acknowledgment_trigger ON booking_services;
DROP TRIGGER IF EXISTS update_extension_acknowledgment_trigger ON booking_services;
DROP FUNCTION IF EXISTS create_extension_acknowledgment();

-- 2. สร้าง Trigger Function ใหม่ (รองรับทั้ง Hotel + Customer App)
CREATE OR REPLACE FUNCTION create_extension_acknowledgment()
RETURNS TRIGGER AS $$
DECLARE
  target_job_id UUID;
  target_staff_profile_id UUID;
BEGIN
  -- เฉพาะ extension services เท่านั้น
  -- รองรับการขยายเวลาจาก: Hotel App, Customer App, Admin App
  IF NEW.is_extension = TRUE THEN
    -- หา job และ staff สำหรับ booking นี้
    SELECT j.id, j.staff_id
    INTO target_job_id, target_staff_profile_id
    FROM jobs j
    WHERE j.booking_id = NEW.booking_id
    AND j.status IN ('assigned', 'confirmed', 'traveling', 'arrived', 'in_progress')
    LIMIT 1;

    -- สร้าง acknowledgment record ถ้าเจอ staff
    IF target_staff_profile_id IS NOT NULL THEN
      INSERT INTO extension_acknowledgments (
        staff_profile_id,
        booking_service_id,
        job_id
      ) VALUES (
        target_staff_profile_id,
        NEW.id,
        target_job_id
      )
      ON CONFLICT (staff_profile_id, booking_service_id) DO NOTHING;

      RAISE NOTICE 'Extension acknowledgment created for staff % and service %',
        target_staff_profile_id, NEW.id;
    ELSE
      RAISE NOTICE 'No active job found for booking % when creating extension',
        NEW.booking_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. สร้าง Trigger สำหรับ INSERT (การจองใหม่)
CREATE TRIGGER create_extension_acknowledgment_trigger
  AFTER INSERT ON booking_services
  FOR EACH ROW
  WHEN (NEW.is_extension = TRUE)
  EXECUTE FUNCTION create_extension_acknowledgment();

-- 4. สร้าง Trigger สำหรับ UPDATE (กรณีเปลี่ยน is_extension เป็น true)
CREATE TRIGGER update_extension_acknowledgment_trigger
  AFTER UPDATE ON booking_services
  FOR EACH ROW
  WHEN (NEW.is_extension = TRUE AND (OLD.is_extension IS DISTINCT FROM NEW.is_extension))
  EXECUTE FUNCTION create_extension_acknowledgment();

-- 5. แก้ไข RPC Function ที่มี column error
DROP FUNCTION IF EXISTS get_pending_extension_acknowledgments(UUID);

CREATE OR REPLACE FUNCTION get_pending_extension_acknowledgments(staff_profile_id UUID)
RETURNS TABLE (
  acknowledgment_id UUID,
  booking_service_id UUID,
  job_id UUID,
  service_name TEXT,
  customer_name TEXT,
  duration INTEGER,
  price DECIMAL(10,2),
  extended_at TIMESTAMPTZ,
  booking_number TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.id as acknowledgment_id,
    ea.booking_service_id,
    ea.job_id,
    s.name_th as service_name,
    COALESCE(b.customer_notes, 'ลูกค้า') as customer_name,  -- แก้จาก customer_name
    bs.duration,
    bs.price,
    bs.extended_at,
    b.booking_number
  FROM extension_acknowledgments ea
  JOIN booking_services bs ON bs.id = ea.booking_service_id
  JOIN services s ON s.id = bs.service_id
  JOIN bookings b ON b.id = bs.booking_id
  WHERE ea.staff_profile_id = $1
    AND ea.acknowledged_at IS NULL
    AND bs.is_extension = true
  ORDER BY bs.extended_at DESC;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION create_extension_acknowledgment() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_extension_acknowledgments(UUID) TO authenticated;