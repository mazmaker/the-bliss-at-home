-- Migration: Update Bookings for Fixed Pricing and Commission System
-- Description: Add commission tracking fields to support fixed pricing system
-- Version: 20260213000000

-- ============================================
-- ADD COMMISSION TRACKING COLUMNS
-- ============================================

-- เพิ่มคอลัมน์สำหรับระบบ Fixed Pricing Commission
ALTER TABLE bookings ADD COLUMN commission_rate_snapshot DECIMAL(5,2);
ALTER TABLE bookings ADD COLUMN price_charged DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN service_revenue DECIMAL(10,2);

-- เปลี่ยนชื่อ staff_earnings เป็น staff_commission เพื่อความชัดเจน
ALTER TABLE bookings RENAME COLUMN staff_earnings TO staff_commission;

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- เพิ่ม constraints เพื่อให้แน่ใจว่าข้อมูลถูกต้อง
ALTER TABLE bookings ADD CONSTRAINT check_commission_rate_valid
  CHECK (commission_rate_snapshot IS NULL OR (commission_rate_snapshot >= 0 AND commission_rate_snapshot <= 100));

ALTER TABLE bookings ADD CONSTRAINT check_price_charged_positive
  CHECK (price_charged IS NULL OR price_charged > 0);

ALTER TABLE bookings ADD CONSTRAINT check_service_revenue_positive
  CHECK (service_revenue IS NULL OR service_revenue >= 0);

ALTER TABLE bookings ADD CONSTRAINT check_staff_commission_positive
  CHECK (staff_commission IS NULL OR staff_commission >= 0);

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- เพิ่ม indexes สำหรับ query performance
CREATE INDEX idx_bookings_commission_rate ON bookings(commission_rate_snapshot)
  WHERE commission_rate_snapshot IS NOT NULL;

CREATE INDEX idx_bookings_price_charged ON bookings(price_charged)
  WHERE price_charged IS NOT NULL;

-- ============================================
-- CREATE COMMISSION CALCULATION FUNCTION
-- ============================================

-- Function เพื่อคำนวณ commission จาก Fixed Pricing
CREATE OR REPLACE FUNCTION calculate_booking_commission(
  p_service_id UUID,
  p_duration INTEGER,
  p_commission_rate DECIMAL
)
RETURNS TABLE(
  price_charged DECIMAL(10,2),
  staff_commission DECIMAL(10,2),
  service_revenue DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_price DECIMAL(10,2);
  v_commission DECIMAL(10,2);
  v_revenue DECIMAL(10,2);
BEGIN
  -- ดึงราคาจาก Fixed Pricing System ตามระยะเวลา
  SELECT
    CASE
      WHEN p_duration = 60 THEN COALESCE(s.price_60, s.base_price)
      WHEN p_duration = 90 THEN COALESCE(s.price_90, ROUND(s.base_price * 1.435))
      WHEN p_duration = 120 THEN COALESCE(s.price_120, ROUND(s.base_price * 1.855))
      ELSE s.base_price -- fallback
    END INTO v_price
  FROM services s
  WHERE s.id = p_service_id;

  -- คำนวณ commission และ revenue
  v_commission := ROUND(v_price * (p_commission_rate / 100), 2);
  v_revenue := v_price - v_commission;

  -- Return ผลลัพธ์
  RETURN QUERY SELECT v_price, v_commission, v_revenue;
END;
$$;

-- ============================================
-- CREATE TRIGGER FOR AUTO-CALCULATION
-- ============================================

-- Function สำหรับ trigger ที่จะคำนวณ commission อัตโนมัติ
CREATE OR REPLACE FUNCTION auto_calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_calculation RECORD;
BEGIN
  -- คำนวณ commission เมื่อมีการ insert หรือ update
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND
     NEW.service_id IS NOT NULL AND
     NEW.duration IS NOT NULL THEN

    -- ดึง commission rate จาก services ถ้าไม่ได้ระบุ
    IF NEW.commission_rate_snapshot IS NULL THEN
      SELECT staff_commission_rate
      INTO NEW.commission_rate_snapshot
      FROM services
      WHERE id = NEW.service_id;
    END IF;

    -- คำนวณราคาและ commission
    SELECT * INTO v_calculation
    FROM calculate_booking_commission(
      NEW.service_id,
      NEW.duration,
      NEW.commission_rate_snapshot
    );

    -- อัพเดตค่าที่คำนวณได้
    NEW.price_charged := v_calculation.price_charged;
    NEW.staff_commission := v_calculation.staff_commission;
    NEW.service_revenue := v_calculation.service_revenue;

    -- อัพเดต final_price ให้สอดคล้องกับ price_charged
    NEW.final_price := NEW.price_charged - COALESCE(NEW.discount_amount, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger
DROP TRIGGER IF EXISTS auto_calculate_booking_commission ON bookings;
CREATE TRIGGER auto_calculate_booking_commission
  BEFORE INSERT OR UPDATE OF service_id, duration, commission_rate_snapshot
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_commission();

-- ============================================
-- MIGRATE EXISTING DATA (OPTIONAL)
-- ============================================

-- อัพเดตข้อมูลเก่าให้ใช้ระบบใหม่ (ถ้าต้องการ)
-- Note: แสดงไว้เป็นตัวอย่าง สามารถ uncomment ได้ถ้าต้องการ migrate ข้อมูลเก่า

/*
UPDATE bookings SET
  price_charged = base_price,
  commission_rate_snapshot = (
    SELECT staff_commission_rate
    FROM services
    WHERE services.id = bookings.service_id
  ),
  staff_commission = ROUND(base_price * (
    SELECT staff_commission_rate / 100.0
    FROM services
    WHERE services.id = bookings.service_id
  ), 2),
  service_revenue = base_price - ROUND(base_price * (
    SELECT staff_commission_rate / 100.0
    FROM services
    WHERE services.id = bookings.service_id
  ), 2)
WHERE price_charged IS NULL;
*/

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN bookings.commission_rate_snapshot IS 'Commission rate percentage at time of booking (preserved for history)';
COMMENT ON COLUMN bookings.price_charged IS 'Actual price charged based on fixed pricing system';
COMMENT ON COLUMN bookings.service_revenue IS 'Company revenue after staff commission deduction';
COMMENT ON COLUMN bookings.staff_commission IS 'Staff commission amount (renamed from staff_earnings)';

COMMENT ON FUNCTION calculate_booking_commission(UUID, INTEGER, DECIMAL) IS 'Calculate commission based on fixed pricing system';
COMMENT ON FUNCTION auto_calculate_commission() IS 'Auto-calculate commission when booking is created or updated';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- เช็คว่าคอลัมน์ใหม่ถูกเพิ่มแล้ว
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'bookings'
--   AND column_name IN ('commission_rate_snapshot', 'price_charged', 'service_revenue', 'staff_commission')
-- ORDER BY column_name;