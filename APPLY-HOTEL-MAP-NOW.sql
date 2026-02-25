-- 🗺️ APPLY HOTEL MAP MIGRATION NOW
-- Copy-paste ใน Supabase SQL Editor หรือ Database tool
-- Date: 2026-02-20

-- 1. Add latitude/longitude columns to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- 2. Add comments for documentation
COMMENT ON COLUMN hotels.latitude IS 'Hotel latitude coordinate for Google Maps display (decimal degrees)';
COMMENT ON COLUMN hotels.longitude IS 'Hotel longitude coordinate for Google Maps display (decimal degrees)';

-- 3. Add spatial index for performance
CREATE INDEX IF NOT EXISTS idx_hotels_coordinates ON hotels(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Add validation constraints
ALTER TABLE hotels
ADD CONSTRAINT IF NOT EXISTS check_latitude_range
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE hotels
ADD CONSTRAINT IF NOT EXISTS check_longitude_range
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- 5. Update resort-chiang-mai with Chiang Mai coordinates
UPDATE hotels
SET
  latitude = 18.7883,
  longitude = 98.9853
WHERE hotel_slug = 'resort-chiang-mai'
   OR id = '550e8400-e29b-41d4-a716-446655440002'
   OR name_en ILIKE '%Chiang Mai%'
   OR name_th ILIKE '%เชียงใหม่%';

-- 6. Update Bangkok hotels with Bangkok coordinates
UPDATE hotels
SET
  latitude = 13.7563,
  longitude = 100.5018
WHERE hotel_slug IN ('grand-palace-bangkok', 'dusit-thani-bangkok')
   OR name_en ILIKE '%Bangkok%'
   OR name_th ILIKE '%กรุงเทพ%'
   OR name_th ILIKE '%บางกอก%';

-- 7. Update other popular destinations
UPDATE hotels
SET
  latitude = 7.8804,
  longitude = 98.2925
WHERE name_en ILIKE '%Phuket%'
   OR name_th ILIKE '%ภูเก็ต%'
   OR name_en ILIKE '%Patong%';

UPDATE hotels
SET
  latitude = 12.9236,
  longitude = 100.8825
WHERE name_en ILIKE '%Pattaya%'
   OR name_th ILIKE '%พัทยา%';

-- 8. Verify results - Show all hotels with their coordinates
SELECT
  '✅ MIGRATION RESULTS' AS status,
  COUNT(*) AS total_hotels,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) AS hotels_with_coordinates
FROM hotels;

-- 9. Show detailed hotel information
SELECT
  ROW_NUMBER() OVER (ORDER BY name_th) AS no,
  name_th,
  name_en,
  hotel_slug,
  id,
  address,
  latitude,
  longitude,
  status,
  CASE
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN '✅ Ready for Auto Map'
    ELSE '⏳ Need Coordinates (Admin can add)'
  END AS map_status
FROM hotels
ORDER BY
  CASE WHEN latitude IS NOT NULL THEN 0 ELSE 1 END,
  name_th;

-- 10. Success message
SELECT
  '🗺️ Hotel Auto Map Migration Completed!' AS message,
  'Now refresh Hotel Profile page to see the map' AS next_step,
  'Admin can add more coordinates at /admin/hotels' AS admin_action;