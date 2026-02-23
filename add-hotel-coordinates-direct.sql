-- 🗺️ Hotel Coordinates Migration - Direct SQL
-- Add latitude/longitude columns to hotels table
-- Date: 2026-02-20

-- 1. Add latitude and longitude columns to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- 2. Add comments to document the columns
COMMENT ON COLUMN hotels.latitude IS 'Hotel latitude coordinate for Google Maps display (decimal degrees)';
COMMENT ON COLUMN hotels.longitude IS 'Hotel longitude coordinate for Google Maps display (decimal degrees)';

-- 3. Add index for spatial queries
CREATE INDEX IF NOT EXISTS idx_hotels_coordinates ON hotels(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Add check constraints for coordinate validation
ALTER TABLE hotels
ADD CONSTRAINT IF NOT EXISTS check_latitude_range
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE hotels
ADD CONSTRAINT IF NOT EXISTS check_longitude_range
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- 5. Create validation function
CREATE OR REPLACE FUNCTION validate_hotel_coordinates(lat DECIMAL, lng DECIMAL)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate latitude range (-90 to 90)
  IF lat IS NOT NULL AND (lat < -90 OR lat > 90) THEN
    RETURN FALSE;
  END IF;

  -- Validate longitude range (-180 to 180)
  IF lng IS NOT NULL AND (lng < -180 OR lng > 180) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION validate_hotel_coordinates TO authenticated;
GRANT EXECUTE ON FUNCTION validate_hotel_coordinates TO anon;

-- 7. Update sample hotels with real coordinates

-- Bangkok hotels (Siam area coordinates: 13.7563, 100.5018)
UPDATE hotels
SET
  latitude = 13.7563,
  longitude = 100.5018
WHERE hotel_slug IN ('grand-palace-bangkok', 'dusit-thani-bangkok')
   OR name_en ILIKE '%Bangkok%'
   OR name_th ILIKE '%กรุงเทพ%'
   OR name_th ILIKE '%บางกอก%';

-- Chiang Mai hotels (Old City coordinates: 18.7883, 98.9853)
UPDATE hotels
SET
  latitude = 18.7883,
  longitude = 98.9853
WHERE hotel_slug IN ('resort-chiang-mai')
   OR name_en ILIKE '%Chiang Mai%'
   OR name_th ILIKE '%เชียงใหม่%';

-- Phuket hotels (Patong coordinates: 7.8804, 98.2925)
UPDATE hotels
SET
  latitude = 7.8804,
  longitude = 98.2925
WHERE name_en ILIKE '%Phuket%'
   OR name_th ILIKE '%ภูเก็ต%'
   OR name_en ILIKE '%Patong%'
   OR name_th ILIKE '%ป่าตอง%';

-- Pattaya hotels (Central Pattaya: 12.9236, 100.8825)
UPDATE hotels
SET
  latitude = 12.9236,
  longitude = 100.8825
WHERE name_en ILIKE '%Pattaya%'
   OR name_th ILIKE '%พัทยา%';

-- Hua Hin hotels (Hua Hin center: 12.5747, 99.9581)
UPDATE hotels
SET
  latitude = 12.5747,
  longitude = 99.9581
WHERE name_en ILIKE '%Hua Hin%'
   OR name_th ILIKE '%หัวหิน%';

-- 8. Display results
SELECT
  '✅ Hotel Coordinates Migration Completed!' AS status,
  COUNT(*) AS total_hotels,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) AS hotels_with_coordinates
FROM hotels;

-- 9. Show hotels with coordinates
SELECT
  name_th,
  name_en,
  hotel_slug,
  latitude,
  longitude,
  CASE
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN '✅ Ready for Map'
    ELSE '⏳ Need Coordinates'
  END AS map_status
FROM hotels
ORDER BY
  CASE WHEN latitude IS NOT NULL THEN 0 ELSE 1 END,
  name_th;

-- Success message
SELECT
  '🗺️ Auto Hotel Profile + Map is now ready!' AS next_steps,
  'Admin can add coordinates → Hotel Profile shows map automatically' AS description;