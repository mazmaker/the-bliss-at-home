-- Safe Complete Thai Geography Data
-- ข้อมูลภูมิศาสตร์ไทยแบบ Mock ที่ครบและปลอดภัย
-- ไม่ต้องดาวน์โหลดจาก Internet

-- ============================================
-- Clear existing data (except Bangkok which has real data)
-- ============================================
DELETE FROM thai_subdistricts WHERE district_id IN
  (SELECT id FROM thai_districts WHERE province_id > 1);
DELETE FROM thai_districts WHERE province_id > 1;

-- ============================================
-- Create districts for all provinces (except Bangkok)
-- Each province gets realistic number of districts
-- ============================================

-- Popular provinces get more districts, others get basic districts
INSERT INTO thai_districts (province_id, name_th, name_en, district_code)
VALUES

-- นนทบุรี (Major suburb)
(3, 'เมืองนนทบุรี', 'Mueang Nonthaburi', 1201),
(3, 'บางกรวย', 'Bang Kruai', 1202),
(3, 'บางใหญ่', 'Bang Yai', 1203),
(3, 'ปากเกร็ด', 'Pak Kret', 1204),
(3, 'บางบัวทอง', 'Bang Bua Thong', 1205),
(3, 'ไทรน้อย', 'Sai Noi', 1206),

-- ปทุมธานี (Major suburb)
(4, 'เมืองปทุมธานี', 'Mueang Pathum Thani', 1301),
(4, 'คลองหลวง', 'Khlong Luang', 1302),
(4, 'ธัญบุรี', 'Thanyaburi', 1303),
(4, 'รังสิต', 'Rangsit', 1304),
(4, 'หนองเสือ', 'Nong Suea', 1305),

-- ชลบุรี (Tourist province)
(11, 'เมืองชลบุรี', 'Mueang Chon Buri', 2001),
(11, 'บางละมุง', 'Bang Lamung', 2002),
(11, 'ศรีราชา', 'Si Racha', 2003),
(11, 'สัตหีบ', 'Sattahip', 2004),
(11, 'พานทอง', 'Phan Thong', 2005),
(11, 'บ่อทอง', 'Bo Thong', 2006),

-- เชียงใหม่ (Major northern city)
(39, 'เมืองเชียงใหม่', 'Mueang Chiang Mai', 5001),
(39, 'แม่ริม', 'Mae Rim', 5002),
(39, 'ดอยสะเก็ด', 'Doi Saket', 5003),
(39, 'แม่แตง', 'Mae Taeng', 5004),
(39, 'เชียงดาว', 'Chiang Dao', 5005),
(39, 'สันทราย', 'San Sai', 5006),
(39, 'สันกำแพง', 'San Kamphaeng', 5007),
(39, 'สารภี', 'Saraphi', 5008),

-- ภูเก็ต (Tourist island)
(64, 'เมืองภูเก็ต', 'Mueang Phuket', 8301),
(64, 'กะทู้', 'Kathu', 8302),
(64, 'ถลาง', 'Thalang', 8303),

-- ขอนแก่น (Major northeastern city)
(29, 'เมืองขอนแก่น', 'Mueang Khon Kaen', 4001),
(29, 'บ้านไผ่', 'Ban Phai', 4002),
(29, 'พระยืน', 'Phra Yuen', 4003),
(29, 'หนองเรือ', 'Nong Ruea', 4004),
(29, 'ชุมแพ', 'Chum Phae', 4005),

-- สงขลา (Major southern province)
(67, 'เมืองสงขลา', 'Mueang Songkhla', 9001),
(67, 'หาดใหญ่', 'Hat Yai', 9002),
(67, 'นาทวี', 'Na Thawi', 9003),
(67, 'เทพา', 'Thepha', 9004),
(67, 'ระโนด', 'Ranot', 9005);

-- ============================================
-- For all other provinces, create basic districts
-- ============================================

INSERT INTO thai_districts (province_id, name_th, name_en, district_code)
SELECT
  p.id,
  'เมือง' || p.name_th,
  'Mueang ' || p.name_en,
  (p.province_code * 100 + 1)::int
FROM thai_provinces p
WHERE p.id NOT IN (1, 3, 4, 11, 29, 39, 64, 67)  -- Skip provinces with detailed data above
UNION ALL
SELECT
  p.id,
  p.name_th || ' นอก',
  p.name_en || ' Outer',
  (p.province_code * 100 + 2)::int
FROM thai_provinces p
WHERE p.id NOT IN (1, 3, 4, 11, 29, 39, 64, 67);

-- ============================================
-- Create subdistricts for all districts
-- ============================================

INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode)
SELECT
  d.id,
  'ตำบลกลาง',
  'Central',
  LPAD(p.province_code::text || '00', 5, '0')
FROM thai_districts d
JOIN thai_provinces p ON p.id = d.province_id
WHERE d.id NOT IN (SELECT DISTINCT district_id FROM thai_subdistricts WHERE district_id IS NOT NULL)
UNION ALL
SELECT
  d.id,
  'ตำบลใต้',
  'South',
  LPAD(p.province_code::text || '01', 5, '0')
FROM thai_districts d
JOIN thai_provinces p ON p.id = d.province_id
WHERE d.id NOT IN (SELECT DISTINCT district_id FROM thai_subdistricts WHERE district_id IS NOT NULL)
UNION ALL
SELECT
  d.id,
  'ตำบลเหนือ',
  'North',
  LPAD(p.province_code::text || '02', 5, '0')
FROM thai_districts d
JOIN thai_provinces p ON p.id = d.province_id
WHERE d.id NOT IN (SELECT DISTINCT district_id FROM thai_subdistricts WHERE district_id IS NOT NULL)
UNION ALL
SELECT
  d.id,
  'ตำบลตะวันออก',
  'East',
  LPAD(p.province_code::text || '03', 5, '0')
FROM thai_districts d
JOIN thai_provinces p ON p.id = d.province_id
WHERE d.id NOT IN (SELECT DISTINCT district_id FROM thai_subdistricts WHERE district_id IS NOT NULL)
UNION ALL
SELECT
  d.id,
  'ตำบลตะวันตก',
  'West',
  LPAD(p.province_code::text || '04', 5, '0')
FROM thai_districts d
JOIN thai_provinces p ON p.id = d.province_id
WHERE d.id NOT IN (SELECT DISTINCT district_id FROM thai_subdistricts WHERE district_id IS NOT NULL);

-- ============================================
-- Add some realistic subdistricts for major districts
-- ============================================

-- Bangkok (improve existing)
UPDATE thai_subdistricts SET
  name_th = 'ศรีภูมิ', name_en = 'Si Phum', zipcode = '50200'
WHERE district_id = (SELECT id FROM thai_districts WHERE name_th = 'พระนคร' AND province_id = 1)
AND name_th = 'พระบรมมหาราชวัง';

-- Chiang Mai (real subdistricts)
INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode) VALUES
((SELECT id FROM thai_districts WHERE name_th = 'เมืองเชียงใหม่'), 'ศรีภูมิ', 'Si Phum', '50200'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองเชียงใหม่'), 'พระสิงห์', 'Phra Sing', '50200'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองเชียงใหม่'), 'หายยา', 'Haiya', '50100'),
((SELECT id FROM thai_districts WHERE name_th = 'แม่ริม'), 'แม่ริม', 'Mae Rim', '50180'),
((SELECT id FROM thai_districts WHERE name_th = 'แม่ริม'), 'สะหลวง', 'Saluang', '50180');

-- Phuket (real subdistricts)
INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode) VALUES
((SELECT id FROM thai_districts WHERE name_th = 'เมืองภูเก็ต'), 'ตลาดใหญ่', 'Talat Yai', '83000'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองภูเก็ต'), 'ตลาดเหนือ', 'Talat Nuea', '83000'),
((SELECT id FROM thai_districts WHERE name_th = 'กะทู้'), 'ป่าตอง', 'Patong', '83150'),
((SELECT id FROM thai_districts WHERE name_th = 'กะทู้'), 'กมลา', 'Kamala', '83150');

-- Chonburi (real subdistricts)
INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode) VALUES
((SELECT id FROM thai_districts WHERE name_th = 'บางละมุง'), 'นาเกลือ', 'Na Kluea', '20150'),
((SELECT id FROM thai_districts WHERE name_th = 'บางละมุง'), 'หนองปรือ', 'Nong Prue', '20150'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองชลบุรี'), 'บ้านสวน', 'Ban Suan', '20000');

-- ============================================
-- Create performance indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_districts_province_name ON thai_districts(province_id, name_th);
CREATE INDEX IF NOT EXISTS idx_subdistricts_district_name ON thai_subdistricts(district_id, name_th);
CREATE INDEX IF NOT EXISTS idx_subdistricts_zipcode ON thai_subdistricts(zipcode);

-- ============================================
-- Summary
-- ============================================

SELECT
  '✅ Safe Thai geography data created successfully!' as status,
  (SELECT COUNT(*) FROM thai_provinces) as total_provinces,
  (SELECT COUNT(*) FROM thai_districts) as total_districts,
  (SELECT COUNT(*) FROM thai_subdistricts) as total_subdistricts,
  'All provinces now have dropdown data' as result;

-- Test sample
SELECT
  p.name_th as จังหวัด,
  d.name_th as อำเภอ,
  s.name_th as ตำบล,
  s.zipcode as รหัสไปรษณีย์
FROM thai_provinces p
JOIN thai_districts d ON p.id = d.province_id
JOIN thai_subdistricts s ON d.id = s.district_id
WHERE p.name_th = 'เชียงใหม่'
LIMIT 5;