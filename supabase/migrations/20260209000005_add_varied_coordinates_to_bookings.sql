-- Add varied coordinates to bookings based on hotel or random distribution
-- This makes the map display more realistic for testing

-- Update bookings with coordinates based on hotel_id or distribute across Bangkok

-- For hotel bookings, assign coordinates near popular hotel areas
-- Hotel 1 area: Sukhumvit
UPDATE bookings
SET
  latitude = 13.736717,
  longitude = 100.559564
WHERE (latitude IS NULL OR longitude IS NULL)
  AND hotel_id = '550e8400-e29b-41d4-a716-446655440001';

-- Hotel 2 area: Siam
UPDATE bookings
SET
  latitude = 13.746562,
  longitude = 100.534196
WHERE (latitude IS NULL OR longitude IS NULL)
  AND hotel_id = '550e8400-e29b-41d4-a716-446655440002';

-- Hotel 3 area: Silom
UPDATE bookings
SET
  latitude = 13.724919,
  longitude = 100.531543
WHERE (latitude IS NULL OR longitude IS NULL)
  AND hotel_id = '550e8400-e29b-41d4-a716-446655440003';

-- Hotel 4 area: Sathorn
UPDATE bookings
SET
  latitude = 13.720355,
  longitude = 100.534136
WHERE (latitude IS NULL OR longitude IS NULL)
  AND hotel_id = '550e8400-e29b-41d4-a716-446655440004';

-- Hotel 5 area: Riverside
UPDATE bookings
SET
  latitude = 13.722950,
  longitude = 100.512530
WHERE (latitude IS NULL OR longitude IS NULL)
  AND hotel_id = '550e8400-e29b-41d4-a716-446655440005';

-- For non-hotel bookings or remaining NULL values, distribute across Bangkok
-- Thonglor area
UPDATE bookings
SET
  latitude = 13.736300 + (RANDOM() * 0.01),
  longitude = 100.583700 + (RANDOM() * 0.01)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND id IN (
    SELECT id FROM bookings
    WHERE latitude IS NULL OR longitude IS NULL
    ORDER BY created_at
    LIMIT (SELECT COUNT(*)/5 FROM bookings WHERE latitude IS NULL OR longitude IS NULL)
  );

-- Asoke area
UPDATE bookings
SET
  latitude = 13.737000 + (RANDOM() * 0.01),
  longitude = 100.560100 + (RANDOM() * 0.01)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND id IN (
    SELECT id FROM bookings
    WHERE latitude IS NULL OR longitude IS NULL
    ORDER BY created_at
    LIMIT (SELECT COUNT(*)/4 FROM bookings WHERE latitude IS NULL OR longitude IS NULL)
  );

-- Phrom Phong area
UPDATE bookings
SET
  latitude = 13.729800 + (RANDOM() * 0.01),
  longitude = 100.569900 + (RANDOM() * 0.01)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND id IN (
    SELECT id FROM bookings
    WHERE latitude IS NULL OR longitude IS NULL
    ORDER BY created_at
    LIMIT (SELECT COUNT(*)/3 FROM bookings WHERE latitude IS NULL OR longitude IS NULL)
  );

-- Ratchada area
UPDATE bookings
SET
  latitude = 13.761300 + (RANDOM() * 0.01),
  longitude = 100.574200 + (RANDOM() * 0.01)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND id IN (
    SELECT id FROM bookings
    WHERE latitude IS NULL OR longitude IS NULL
    ORDER BY created_at
    LIMIT (SELECT COUNT(*)/2 FROM bookings WHERE latitude IS NULL OR longitude IS NULL)
  );

-- Default Siam area for any remaining
UPDATE bookings
SET
  latitude = 13.746562 + (RANDOM() * 0.01),
  longitude = 100.534196 + (RANDOM() * 0.01)
WHERE latitude IS NULL OR longitude IS NULL;

-- Verify all bookings now have coordinates
DO $$
DECLARE
  total_bookings INT;
  bookings_with_coords INT;
BEGIN
  SELECT COUNT(*) INTO total_bookings FROM bookings;
  SELECT COUNT(*) INTO bookings_with_coords FROM bookings WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

  RAISE NOTICE 'Total bookings: %', total_bookings;
  RAISE NOTICE 'Bookings with coordinates: %', bookings_with_coords;
  RAISE NOTICE 'Migration completed successfully!';
END $$;
