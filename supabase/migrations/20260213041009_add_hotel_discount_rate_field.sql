-- Add discount rate column to hotels table
-- This allows hotels to specify their discount rate percentage for customers

-- Add discount_rate column with default value of 20%
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 20.00;

-- Add constraint to ensure discount_rate is valid (0-100%)
ALTER TABLE hotels ADD CONSTRAINT IF NOT EXISTS check_discount_rate_valid
  CHECK (discount_rate IS NULL OR (discount_rate >= 0 AND discount_rate <= 100));

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_hotels_discount_rate ON hotels(discount_rate)
  WHERE discount_rate IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN hotels.discount_rate IS 'Discount rate percentage offered by hotel to customers (0-100%)';