-- Migration: Add Commission System to Services Table
-- Description: Add staff commission percentage and calculation fields
-- Version: 20260127082000

-- ============================================
-- ADD COMMISSION FIELDS TO SERVICES TABLE
-- ============================================

ALTER TABLE services
ADD COLUMN IF NOT EXISTS staff_commission_rate DECIMAL(5,2) DEFAULT 25.00
  CHECK (staff_commission_rate >= 0.00 AND staff_commission_rate <= 100.00);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN services.staff_commission_rate IS 'Staff commission rate as percentage (0.00-100.00%)';

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Set default commission rates for existing services
UPDATE services
SET staff_commission_rate = CASE
  WHEN category = 'massage' THEN 30.00  -- นวด 30%
  WHEN category = 'nail' THEN 25.00     -- เล็บ 25%
  WHEN category = 'spa' THEN 35.00      -- สปา 35%
  WHEN category = 'facial' THEN 28.00   -- เฟเชียล 28%
  ELSE 25.00                            -- default 25%
END
WHERE staff_commission_rate IS NULL OR staff_commission_rate = 25.00;

-- ============================================
-- EXAMPLE COMMISSION CALCULATIONS
-- ============================================

/*
Commission calculation examples:

1. Thai Massage 2 hrs - 1,000 บาท × 30% = 300 บาท (Staff gets)
2. Classic Manicure - 500 บาท × 25% = 125 บาท (Staff gets)
3. Spa Facial Deluxe - 1,500 บาท × 35% = 525 บาท (Staff gets)
4. Anti-Aging Facial - 800 บาท × 28% = 224 บาท (Staff gets)

Usage in application:
SELECT
  name_th,
  name_en,
  base_price,
  staff_commission_rate,
  ROUND(base_price * (staff_commission_rate / 100), 2) as staff_commission_amount,
  ROUND(base_price - (base_price * (staff_commission_rate / 100)), 2) as company_revenue
FROM services
WHERE is_active = true;
*/