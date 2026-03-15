-- Migration: Add Fixed Pricing Support
-- Description: Add price columns for each duration (60, 90, 120 minutes)
-- Version: 20260212150000

-- ============================================
-- ADD PRICE COLUMNS FOR EACH DURATION
-- ============================================

-- เพิ่มคอลัมน์ราคาแยกตามระยะเวลา (nullable สำหรับ gradual migration)
ALTER TABLE services ADD COLUMN price_60 DECIMAL(10,2);
ALTER TABLE services ADD COLUMN price_90 DECIMAL(10,2);
ALTER TABLE services ADD COLUMN price_120 DECIMAL(10,2);

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- Migration ข้อมูลเก่าจาก base_price เป็นราคาแยก โดยใช้ multipliers จาก pricingUtils.ts
UPDATE services SET
  price_60 = base_price,                      -- 60 นาที = base_price (1.0x)
  price_90 = ROUND(base_price * 1.435),       -- 90 นาที = base_price × 1.435
  price_120 = ROUND(base_price * 1.855)       -- 120 นาที = base_price × 1.855
WHERE base_price IS NOT NULL;

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- เพิ่ม constraints เพื่อให้แน่ใจว่าราคาเป็นค่าบวก
ALTER TABLE services ADD CONSTRAINT check_price_60_positive
  CHECK (price_60 IS NULL OR price_60 > 0);

ALTER TABLE services ADD CONSTRAINT check_price_90_positive
  CHECK (price_90 IS NULL OR price_90 > 0);

ALTER TABLE services ADD CONSTRAINT check_price_120_positive
  CHECK (price_120 IS NULL OR price_120 > 0);

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_services_price_60 ON services(price_60) WHERE price_60 IS NOT NULL;
CREATE INDEX idx_services_price_90 ON services(price_90) WHERE price_90 IS NOT NULL;
CREATE INDEX idx_services_price_120 ON services(price_120) WHERE price_120 IS NOT NULL;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function เพื่อดึงราคาตามระยะเวลา (fallback ไปใช้ calculation ถ้าไม่มี fixed price)
CREATE OR REPLACE FUNCTION get_service_price(
  service_row services,
  duration_minutes INTEGER
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  CASE duration_minutes
    WHEN 60 THEN
      RETURN COALESCE(service_row.price_60, service_row.base_price);
    WHEN 90 THEN
      RETURN COALESCE(service_row.price_90, ROUND(service_row.base_price * 1.435));
    WHEN 120 THEN
      RETURN COALESCE(service_row.price_120, ROUND(service_row.base_price * 1.855));
    ELSE
      -- Fallback calculation สำหรับระยะเวลาอื่นๆ
      IF duration_minutes < 60 THEN
        RETURN ROUND(service_row.base_price * (duration_minutes::DECIMAL / 60));
      ELSIF duration_minutes > 120 THEN
        DECLARE extra_minutes INTEGER := duration_minutes - 120;
        RETURN ROUND(COALESCE(service_row.price_120, service_row.base_price * 1.855) + (extra_minutes::DECIMAL / 60) * service_row.base_price * 0.4);
      ELSE
        -- Linear interpolation between known points
        RETURN ROUND(service_row.base_price * (1.0 + ((duration_minutes - 60)::DECIMAL / 60) * 0.855));
      END IF;
  END CASE;
END;
$$;

-- ============================================
-- UPDATE POLICIES
-- ============================================

-- RLS policies ยังคงใช้ได้เหมือนเดิม เพราะเป็นคอลัมน์ใหม่ในตาราง services เดิม

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN services.price_60 IS 'Fixed price for 60-minute service duration';
COMMENT ON COLUMN services.price_90 IS 'Fixed price for 90-minute service duration';
COMMENT ON COLUMN services.price_120 IS 'Fixed price for 120-minute service duration';
COMMENT ON FUNCTION get_service_price(services, INTEGER) IS 'Get service price for specific duration with fallback to calculation';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify migration success (uncomment to test)
-- SELECT
--   name_th,
--   base_price,
--   price_60,
--   price_90,
--   price_120,
--   ROUND(base_price * 1.435) as expected_90,
--   ROUND(base_price * 1.855) as expected_120
-- FROM services
-- WHERE base_price IS NOT NULL
-- ORDER BY name_th
-- LIMIT 5;