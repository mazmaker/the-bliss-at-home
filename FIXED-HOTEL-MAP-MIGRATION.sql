-- 🗺️ FIXED HOTEL MAP MIGRATION - สำหรับทุกโรงแรม
-- Copy-paste ใน Supabase SQL Editor
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

-- 4. Drop existing constraints if they exist (to avoid conflicts)
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS check_latitude_range;
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS check_longitude_range;

-- 5. Add validation constraints (without IF NOT EXISTS)
ALTER TABLE hotels
ADD CONSTRAINT check_latitude_range
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE hotels
ADD CONSTRAINT check_longitude_range
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- 6. Update resort-chiang-mai (ID: 550e8400-e29b-41d4-a716-446655440002) with Chiang Mai coordinates
UPDATE hotels
SET
  latitude = 18.7883,
  longitude = 98.9853
WHERE hotel_slug = 'resort-chiang-mai'
   OR id = '550e8400-e29b-41d4-a716-446655440002'
   OR name_en ILIKE '%Chiang Mai%'
   OR name_th ILIKE '%เชียงใหม่%';

-- 7. Update Bangkok hotels with Bangkok coordinates (Central Bangkok/Siam area)
UPDATE hotels
SET
  latitude = 13.7563,
  longitude = 100.5018
WHERE hotel_slug IN ('grand-palace-bangkok', 'dusit-thani-bangkok', 'hilton-bangkok')
   OR name_en ILIKE '%Bangkok%'
   OR name_th ILIKE '%กรุงเทพ%'
   OR name_th ILIKE '%บางกอก%';

-- 8. Update other popular destinations (เพิ่มตำแหน่งให้โรงแรมอื่นๆ)

-- Phuket (Patong Beach)
UPDATE hotels
SET
  latitude = 7.8804,
  longitude = 98.2925
WHERE name_en ILIKE '%Phuket%'
   OR name_th ILIKE '%ภูเก็ต%'
   OR name_en ILIKE '%Patong%'
   OR name_th ILIKE '%ป่าตอง%';

-- Pattaya (Central Pattaya)
UPDATE hotels
SET
  latitude = 12.9236,
  longitude = 100.8825
WHERE name_en ILIKE '%Pattaya%'
   OR name_th ILIKE '%พัทยา%';

-- Hua Hin
UPDATE hotels
SET
  latitude = 12.5747,
  longitude = 99.9581
WHERE name_en ILIKE '%Hua Hin%'
   OR name_th ILIKE '%หัวหิน%';

-- Koh Samui
UPDATE hotels
SET
  latitude = 9.5084,
  longitude = 100.0155
WHERE name_en ILIKE '%Samui%'
   OR name_th ILIKE '%สมุย%'
   OR name_en ILIKE '%Koh Samui%';

-- Krabi
UPDATE hotels
SET
  latitude = 8.0863,
  longitude = 98.9063
WHERE name_en ILIKE '%Krabi%'
   OR name_th ILIKE '%กระบี่%';

-- Kanchanaburi
UPDATE hotels
SET
  latitude = 14.0227,
  longitude = 99.5328
WHERE name_en ILIKE '%Kanchanaburi%'
   OR name_th ILIKE '%กาญจนบุรี%';

-- 9. Create helper function for auto-coordinate assignment (สำหรับโรงแรมใหม่)
CREATE OR REPLACE FUNCTION auto_assign_hotel_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign coordinates based on hotel name/location
  IF NEW.latitude IS NULL AND NEW.longitude IS NULL THEN
    -- Bangkok
    IF NEW.name_en ILIKE '%Bangkok%' OR NEW.name_th ILIKE '%กรุงเทพ%' OR NEW.address ILIKE '%กรุงเทพ%' THEN
      NEW.latitude := 13.7563;
      NEW.longitude := 100.5018;
    -- Chiang Mai
    ELSIF NEW.name_en ILIKE '%Chiang Mai%' OR NEW.name_th ILIKE '%เชียงใหม่%' OR NEW.address ILIKE '%เชียงใหม่%' THEN
      NEW.latitude := 18.7883;
      NEW.longitude := 98.9853;
    -- Phuket
    ELSIF NEW.name_en ILIKE '%Phuket%' OR NEW.name_th ILIKE '%ภูเก็ต%' OR NEW.address ILIKE '%ภูเก็ต%' THEN
      NEW.latitude := 7.8804;
      NEW.longitude := 98.2925;
    -- Pattaya
    ELSIF NEW.name_en ILIKE '%Pattaya%' OR NEW.name_th ILIKE '%พัทยา%' OR NEW.address ILIKE '%พัทยา%' THEN
      NEW.latitude := 12.9236;
      NEW.longitude := 100.8825;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for auto-coordinate assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_hotel_coordinates ON hotels;
CREATE TRIGGER trigger_auto_assign_hotel_coordinates
  BEFORE INSERT OR UPDATE ON hotels
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_hotel_coordinates();

-- 11. Verify results - Show all hotels with their coordinates
SELECT
  '✅ HOTEL MAP MIGRATION RESULTS' AS status,
  COUNT(*) AS total_hotels,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) AS hotels_with_coordinates
FROM hotels;

-- 12. Show detailed hotel information
SELECT
  ROW_NUMBER() OVER (ORDER BY
    CASE WHEN latitude IS NOT NULL THEN 0 ELSE 1 END,
    name_th
  ) AS no,
  name_th,
  name_en,
  hotel_slug,
  SUBSTRING(id, 1, 8) || '...' AS short_id,
  SUBSTRING(address, 1, 30) || CASE WHEN LENGTH(address) > 30 THEN '...' ELSE '' END AS short_address,
  latitude,
  longitude,
  status,
  CASE
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN '🗺️ Map Ready'
    ELSE '⏳ Need Coordinates'
  END AS map_status
FROM hotels
ORDER BY
  CASE WHEN latitude IS NOT NULL THEN 0 ELSE 1 END,
  name_th;

-- 13. Test specific hotel that user mentioned
SELECT
  '🔍 SPECIFIC HOTEL CHECK' AS test,
  name_th,
  name_en,
  hotel_slug,
  id,
  address,
  latitude,
  longitude,
  CASE
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL
    THEN '✅ Ready! Visit: http://localhost:3003/hotel/' || hotel_slug || '/profile'
    ELSE '❌ Missing coordinates'
  END AS profile_status
FROM hotels
WHERE id = '550e8400-e29b-41d4-a716-446655440002'
   OR hotel_slug = 'resort-chiang-mai';

-- 14. Success message
SELECT
  '🎉 Migration Completed Successfully!' AS message,
  'All hotels now support Auto Map Display' AS description,
  'Admin can add/edit coordinates for any hotel' AS admin_feature,
  'Hotel Profile pages will auto-display maps when coordinates exist' AS auto_feature;