-- 🗺️ Add Coordinates to Hotels Table
-- Date: 2026-02-20
-- Purpose: Enable automatic map display in Hotel Profile from Admin data

-- 1. Add latitude and longitude columns to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- 2. Add comment to document the columns
COMMENT ON COLUMN hotels.latitude IS 'Hotel latitude coordinate for Google Maps display (decimal degrees)';
COMMENT ON COLUMN hotels.longitude IS 'Hotel longitude coordinate for Google Maps display (decimal degrees)';

-- 3. Add index for spatial queries (if needed for nearby hotels search)
CREATE INDEX IF NOT EXISTS idx_hotels_coordinates ON hotels(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Create helper function to validate coordinates
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

-- 5. Add check constraints for coordinate validation
ALTER TABLE hotels
ADD CONSTRAINT check_latitude_range
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE hotels
ADD CONSTRAINT check_longitude_range
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION validate_hotel_coordinates TO authenticated;
GRANT EXECUTE ON FUNCTION validate_hotel_coordinates TO anon;

-- 7. Update sample data with Bangkok coordinates (for testing)
UPDATE hotels
SET
  latitude = 13.7563,
  longitude = 100.5018
WHERE hotel_slug = 'grand-palace-bangkok' OR name_en LIKE '%Bangkok%';

UPDATE hotels
SET
  latitude = 18.7883,
  longitude = 98.9853
WHERE hotel_slug = 'resort-chiang-mai' OR name_en LIKE '%Chiang Mai%';

UPDATE hotels
SET
  latitude = 13.7244,
  longitude = 100.5014
WHERE hotel_slug = 'dusit-thani-bangkok' OR name_en LIKE '%Dusit%';

-- 8. Success message
SELECT
  '✅ Hotel Coordinates Migration Applied Successfully!' as status,
  'Hotels now have latitude/longitude for automatic map display' as description,
  COUNT(*) as hotels_with_coordinates
FROM hotels
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;