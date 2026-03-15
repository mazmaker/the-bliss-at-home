-- Migration: Add Hotel Discount Rate
-- Description: Add discount rate field for hotels
-- Version: 20260213000100

-- ============================================
-- ADD DISCOUNT RATE COLUMN TO HOTELS TABLE
-- ============================================

-- เพิ่มคอลัมน์อัตราส่วนลด (%) สำหรับโรงแรม
ALTER TABLE hotels ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 20.00;

-- ============================================
-- ADD CONSTRAINT FOR DISCOUNT RATE
-- ============================================

-- เพิ่ม constraint เพื่อให้แน่ใจว่าส่วนลดเป็นค่าที่ถูกต้อง
ALTER TABLE hotels ADD CONSTRAINT check_discount_rate_valid
  CHECK (discount_rate IS NULL OR (discount_rate >= 0 AND discount_rate <= 100));

-- ============================================
-- ADD INDEX FOR PERFORMANCE
-- ============================================

-- เพิ่ม index สำหรับ query performance
CREATE INDEX idx_hotels_discount_rate ON hotels(discount_rate)
  WHERE discount_rate IS NOT NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN hotels.discount_rate IS 'Discount rate percentage offered by hotel to customers';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- เช็คว่าคอลัมน์ใหม่ถูกเพิ่มแล้ว
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'hotels'
--   AND column_name = 'discount_rate';