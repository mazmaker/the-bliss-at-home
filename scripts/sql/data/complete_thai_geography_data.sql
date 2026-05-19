-- Complete Thai Geography Mock Data
-- Creates districts and subdistricts for all 77 provinces

-- ============================================
-- Generate districts for all provinces (except Bangkok which already exists)
-- Each province gets 3-5 districts with realistic names
-- ============================================

INSERT INTO thai_districts (province_id, name_th, name_en, district_code)
SELECT * FROM (
-- สมุทรปราการ (id=2)
SELECT 2, 'เมืองสมุทรปราการ', 'Mueang Samut Prakan', 1101 UNION ALL
SELECT 2, 'บางบ่อ', 'Bang Bo', 1102 UNION ALL
SELECT 2, 'บังพลี', 'Bang Phli', 1103 UNION ALL
SELECT 2, 'พระประแดง', 'Phra Pradaeng', 1104 UNION ALL

-- นนทบุรี (id=3)
SELECT 3, 'เมืองนนทบุรี', 'Mueang Nonthaburi', 1201 UNION ALL
SELECT 3, 'บางกรวย', 'Bang Kruai', 1202 UNION ALL
SELECT 3, 'บางใหญ่', 'Bang Yai', 1203 UNION ALL
SELECT 3, 'ปากเกร็ด', 'Pak Kret', 1204 UNION ALL

-- ปทุมธานี (id=4)
SELECT 4, 'เมืองปทุมธานี', 'Mueang Pathum Thani', 1301 UNION ALL
SELECT 4, 'คลองหลวง', 'Khlong Luang', 1302 UNION ALL
SELECT 4, 'ธัญบุรี', 'Thanyaburi', 1303 UNION ALL
SELECT 4, 'หนองเสือ', 'Nong Suea', 1304 UNION ALL

-- Generate for remaining provinces (5-77)
SELECT p.id, 'เมือง' || p.name_th, 'Mueang ' || p.name_en, (p.province_code * 100 + 1)::int
FROM thai_provinces p WHERE p.id >= 5 UNION ALL

SELECT p.id, p.name_th || ' ใต้', p.name_en || ' South', (p.province_code * 100 + 2)::int
FROM thai_provinces p WHERE p.id >= 5 UNION ALL

SELECT p.id, p.name_th || ' เหนือ', p.name_en || ' North', (p.province_code * 100 + 3)::int
FROM thai_provinces p WHERE p.id >= 5 UNION ALL

SELECT p.id, p.name_th || ' ตะวันออก', p.name_en || ' East', (p.province_code * 100 + 4)::int
FROM thai_provinces p WHERE p.id >= 5 UNION ALL

SELECT p.id, p.name_th || ' ตะวันตก', p.name_en || ' West', (p.province_code * 100 + 5)::int
FROM thai_provinces p WHERE p.id >= 5
) AS districts_data;

-- ============================================
-- Generate subdistricts for all districts
-- Each district gets 4-6 subdistricts
-- ============================================

-- First, get the district IDs we just created
WITH district_data AS (
  SELECT
    d.id,
    d.province_id,
    d.name_th as district_name,
    d.district_code,
    p.province_code
  FROM thai_districts d
  JOIN thai_provinces p ON p.id = d.province_id
  WHERE d.id NOT IN (SELECT DISTINCT district_id FROM thai_subdistricts)
)
INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode)
SELECT * FROM (
  -- Generate 5 subdistricts per district
  SELECT
    dd.id,
    dd.district_name || ' กลาง',
    dd.district_name || ' Central',
    LPAD(dd.province_code::text || '1' || LPAD((row_number() OVER (PARTITION BY dd.id))::text, 2, '0'), 5, '0')
  FROM district_data dd
  CROSS JOIN generate_series(1,1) gs

  UNION ALL

  SELECT
    dd.id,
    'ตำบล ' || dd.district_name || ' ใต้',
    'South ' || dd.district_name,
    LPAD(dd.province_code::text || '2' || LPAD((row_number() OVER (PARTITION BY dd.id))::text, 2, '0'), 5, '0')
  FROM district_data dd
  CROSS JOIN generate_series(1,1) gs

  UNION ALL

  SELECT
    dd.id,
    'ตำบล ' || dd.district_name || ' เหนือ',
    'North ' || dd.district_name,
    LPAD(dd.province_code::text || '3' || LPAD((row_number() OVER (PARTITION BY dd.id))::text, 2, '0'), 5, '0')
  FROM district_data dd
  CROSS JOIN generate_series(1,1) gs

  UNION ALL

  SELECT
    dd.id,
    'ตำบล ' || dd.district_name || ' ตะวันออก',
    'East ' || dd.district_name,
    LPAD(dd.province_code::text || '4' || LPAD((row_number() OVER (PARTITION BY dd.id))::text, 2, '0'), 5, '0')
  FROM district_data dd
  CROSS JOIN generate_series(1,1) gs

  UNION ALL

  SELECT
    dd.id,
    'ตำบล ' || dd.district_name || ' ตะวันตก',
    'West ' || dd.district_name,
    LPAD(dd.province_code::text || '5' || LPAD((row_number() OVER (PARTITION BY dd.id))::text, 2, '0'), 5, '0')
  FROM district_data dd
  CROSS JOIN generate_series(1,1) gs
) AS subdistricts_data;

-- ============================================
-- Add some realistic subdistricts for major provinces manually
-- ============================================

-- Update some Bangkok subdistricts with real names
UPDATE thai_subdistricts SET
  name_th = CASE
    WHEN name_th LIKE '%พระนคร กลาง%' THEN 'พระบรมมหาราชวัง'
    WHEN name_th LIKE '%ดุสิต กลาง%' THEN 'ดุสิต'
    WHEN name_th LIKE '%บางรัก กลาง%' THEN 'สีลม'
    WHEN name_th LIKE '%ปทุมวัน กลาง%' THEN 'ลุมพินี'
    ELSE name_th
  END,
  name_en = CASE
    WHEN name_th LIKE '%พระนคร กลาง%' THEN 'Phra Borom Maha Ratchawang'
    WHEN name_th LIKE '%ดุสิต กลาง%' THEN 'Dusit'
    WHEN name_th LIKE '%บางรัก กลาง%' THEN 'Silom'
    WHEN name_th LIKE '%ปทุมวัน กลาง%' THEN 'Lumpini'
    ELSE name_en
  END
WHERE district_id IN (
  SELECT id FROM thai_districts WHERE province_id = 1
);

-- ============================================
-- Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_thai_districts_province_name ON thai_districts(province_id, name_th);
CREATE INDEX IF NOT EXISTS idx_thai_subdistricts_district_name ON thai_subdistricts(district_id, name_th);

-- ============================================
-- Show summary
-- ============================================

SELECT
  'Geography data completed:' as summary,
  (SELECT COUNT(*) FROM thai_provinces) as total_provinces,
  (SELECT COUNT(*) FROM thai_districts) as total_districts,
  (SELECT COUNT(*) FROM thai_subdistricts) as total_subdistricts;

-- Sample test query
SELECT
  p.name_th as province,
  d.name_th as district,
  s.name_th as subdistrict,
  s.zipcode
FROM thai_provinces p
JOIN thai_districts d ON p.id = d.province_id
JOIN thai_subdistricts s ON d.id = s.district_id
WHERE p.name_th = 'เชียงใหม่'
LIMIT 10;