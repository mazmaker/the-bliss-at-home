-- Fix Services Pricing - Use Only Standard Durations (60/90/120)
-- Remove arbitrary multipliers, use only stored prices

-- 1. Fix สปาไทย: Change 150 min to 120 min
UPDATE services
SET
  duration_options = '[120]'::jsonb,
  duration = 120
WHERE name_th = 'สปาไทย';

-- 2. Add stored prices for services that only use calculated prices

-- แพ็กเกจทาสีเจลมือและเท้า (120 min)
UPDATE services
SET
  price_120 = 1700  -- Use current base_price as 120min price
WHERE name_th = 'แพ็กเกจทาสีเจลมือและเท้า';

-- นวดน้ำมัน (2 ชั่วโมง) (120 min)
UPDATE services
SET
  price_120 = 1000  -- Use current base_price as 120min price
WHERE name_th = 'นวดน้ำมัน (2 ชั่วโมง)';

-- สปาไทย (120 min)
UPDATE services
SET
  price_120 = 2500  -- Use current base_price as 120min price
WHERE name_th = 'สปาไทย';

-- 3. Optional: Add price_60 and price_90 for services that might need them

-- สปาไทย - Add 60 and 90 min options
UPDATE services
SET
  duration_options = '[60, 90, 120]'::jsonb,
  price_60 = 1500,  -- Reasonable 60min price
  price_90 = 2000,  -- Reasonable 90min price
  price_120 = 2500
WHERE name_th = 'สปาไทย';

-- Comment for future reference
-- All services now use standard durations with stored prices
-- No more arbitrary multiplier calculations