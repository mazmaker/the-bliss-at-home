-- Migration: Fix Commission Calculation to Use Discounted Price
-- Description: Update commission calculation to use final_price instead of original price
-- Version: 20260604000000
-- Issue: Staff commission should be calculated from discounted final price, not original price

-- ============================================
-- UPDATE COMMISSION CALCULATION FUNCTION
-- ============================================

-- Updated function to calculate commission from final price (after discount)
CREATE OR REPLACE FUNCTION calculate_booking_commission_with_discount(
  p_service_id UUID,
  p_duration INTEGER,
  p_commission_rate DECIMAL,
  p_discount_amount DECIMAL DEFAULT 0
)
RETURNS TABLE(
  price_charged DECIMAL(10,2),
  final_price DECIMAL(10,2),
  staff_commission DECIMAL(10,2),
  service_revenue DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_price DECIMAL(10,2);
  v_final_price DECIMAL(10,2);
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

  -- คำนวณราคาสุทธิหลังหักส่วนลด
  v_final_price := v_price - COALESCE(p_discount_amount, 0);

  -- 🔧 FIX: คำนวณ commission จากราคาสุทธิ (หลังหักส่วนลด) ไม่ใช่ราคาเต็ม
  v_commission := ROUND(v_final_price * (p_commission_rate / 100), 2);
  v_revenue := v_final_price - v_commission;

  -- Return ผลลัพธ์
  RETURN QUERY SELECT v_price, v_final_price, v_commission, v_revenue;
END;
$$;

-- ============================================
-- UPDATE AUTO-CALCULATION TRIGGER
-- ============================================

-- Updated trigger function that uses discounted price for commission calculation
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

    -- 🔧 FIX: ใช้ฟังก์ชันใหม่ที่คำนวณ commission จากราคาหลังหักส่วนลด
    SELECT * INTO v_calculation
    FROM calculate_booking_commission_with_discount(
      NEW.service_id,
      NEW.duration,
      NEW.commission_rate_snapshot,
      COALESCE(NEW.discount_amount, 0)
    );

    -- อัพเดตค่าที่คำนวณได้
    NEW.price_charged := v_calculation.price_charged;
    NEW.final_price := v_calculation.final_price;
    NEW.staff_commission := v_calculation.staff_commission;
    NEW.service_revenue := v_calculation.service_revenue;

    -- 📝 Note: ลบการคำนวณ final_price ออกเพราะคำนวณในฟังก์ชันแล้ว
    -- NEW.final_price := NEW.price_charged - COALESCE(NEW.discount_amount, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE EXISTING BOOKINGS WITH DISCOUNTS
-- ============================================

-- Update existing bookings that have discount_amount > 0 to recalculate commission correctly
UPDATE bookings
SET staff_commission = ROUND((final_price * commission_rate_snapshot / 100), 2),
    service_revenue = final_price - ROUND((final_price * commission_rate_snapshot / 100), 2)
WHERE discount_amount > 0
  AND commission_rate_snapshot IS NOT NULL
  AND final_price IS NOT NULL
  AND staff_commission IS NOT NULL;

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON FUNCTION calculate_booking_commission_with_discount(UUID, INTEGER, DECIMAL, DECIMAL)
IS 'Calculate commission based on final price after discount (fixed version)';

COMMENT ON FUNCTION auto_calculate_commission()
IS 'Auto-calculate commission from discounted final price when booking is created or updated (fixed version)';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Query to verify commission calculation is working correctly
-- SELECT
--   booking_number,
--   base_price,
--   discount_amount,
--   final_price,
--   commission_rate_snapshot,
--   staff_commission,
--   ROUND((final_price * commission_rate_snapshot / 100), 2) as expected_commission,
--   service_revenue,
--   final_price - staff_commission as expected_revenue
-- FROM bookings
-- WHERE discount_amount > 0
-- ORDER BY created_at DESC
-- LIMIT 10;