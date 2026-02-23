-- Quick fix: Add price columns directly
-- Run this in Supabase SQL Editor

-- Check if columns exist first
DO $$
BEGIN
    -- Add price_60 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='price_60') THEN
        ALTER TABLE services ADD COLUMN price_60 DECIMAL(10,2);
        RAISE NOTICE 'Added price_60 column';
    ELSE
        RAISE NOTICE 'price_60 column already exists';
    END IF;

    -- Add price_90 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='price_90') THEN
        ALTER TABLE services ADD COLUMN price_90 DECIMAL(10,2);
        RAISE NOTICE 'Added price_90 column';
    ELSE
        RAISE NOTICE 'price_90 column already exists';
    END IF;

    -- Add price_120 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='price_120') THEN
        ALTER TABLE services ADD COLUMN price_120 DECIMAL(10,2);
        RAISE NOTICE 'Added price_120 column';
    ELSE
        RAISE NOTICE 'price_120 column already exists';
    END IF;
END $$;

-- Migrate existing data if columns are empty
UPDATE services SET
  price_60 = base_price,
  price_90 = ROUND(base_price * 1.435),
  price_120 = ROUND(base_price * 1.855)
WHERE base_price IS NOT NULL
  AND (price_60 IS NULL OR price_90 IS NULL OR price_120 IS NULL);

-- Add constraints if they don't exist
DO $$
BEGIN
    BEGIN
        ALTER TABLE services ADD CONSTRAINT check_price_60_positive CHECK (price_60 IS NULL OR price_60 > 0);
        RAISE NOTICE 'Added check_price_60_positive constraint';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'check_price_60_positive constraint already exists';
    END;

    BEGIN
        ALTER TABLE services ADD CONSTRAINT check_price_90_positive CHECK (price_90 IS NULL OR price_90 > 0);
        RAISE NOTICE 'Added check_price_90_positive constraint';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'check_price_90_positive constraint already exists';
    END;

    BEGIN
        ALTER TABLE services ADD CONSTRAINT check_price_120_positive CHECK (price_120 IS NULL OR price_120 > 0);
        RAISE NOTICE 'Added check_price_120_positive constraint';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'check_price_120_positive constraint already exists';
    END;
END $$;

-- Verify the schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'services'
  AND column_name IN ('price_60', 'price_90', 'price_120', 'base_price')
ORDER BY column_name;