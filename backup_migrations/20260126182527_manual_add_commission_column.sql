-- Add staff commission column to services table (Manual Fix)
-- Description: Ensure staff_commission_rate column exists in services table

-- Add staff commission column to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS staff_commission_rate DECIMAL(5,2) DEFAULT 25.00
  CHECK (staff_commission_rate >= 0.00 AND staff_commission_rate <= 100.00);

-- Update existing records with category-based defaults
UPDATE services
SET staff_commission_rate = CASE
  WHEN category = 'massage' THEN 30.00
  WHEN category = 'nail' THEN 25.00
  WHEN category = 'spa' THEN 35.00
  WHEN category = 'facial' THEN 28.00
  ELSE 25.00
END
WHERE staff_commission_rate IS NULL OR staff_commission_rate = 25.00;