-- Real Thai Geography Data for Major Provinces
-- ข้อมูลจริงสำหรับจังหวัดที่ใช้บ่อย

-- Delete mock data first
DELETE FROM thai_subdistricts WHERE district_id IN (SELECT id FROM thai_districts WHERE province_id > 1);
DELETE FROM thai_districts WHERE province_id > 1;

-- ============================================
-- เชียงใหม่ (Real Districts)
-- ============================================
INSERT INTO thai_districts (province_id, name_th, name_en, district_code) VALUES
(39, 'เมืองเชียงใหม่', 'Mueang Chiang Mai', 5001),
(39, 'แม่ริม', 'Mae Rim', 5002),
(39, 'ดอยสะเก็ด', 'Doi Saket', 5003),
(39, 'แม่แตง', 'Mae Taeng', 5004),
(39, 'เชียงดาว', 'Chiang Dao', 5005),
(39, 'สันทราย', 'San Sai', 5006),
(39, 'สันกำแพง', 'San Kamphaeng', 5007),
(39, 'สารภี', 'Saraphi', 5008),
(39, 'ฮอด', 'Hot', 5009),
(39, 'ดอยเต่า', 'Doi Tao', 5010);

-- ============================================
-- ภูเก็ต (Real Districts)
-- ============================================
INSERT INTO thai_districts (province_id, name_th, name_en, district_code) VALUES
(64, 'เมืองภูเก็ต', 'Mueang Phuket', 8301),
(64, 'กะทู้', 'Kathu', 8302),
(64, 'ถลาง', 'Thalang', 8303);

-- ============================================
-- ขอนแก่น (Real Districts)
-- ============================================
INSERT INTO thai_districts (province_id, name_th, name_en, district_code) VALUES
(29, 'เมืองขอนแก่น', 'Mueang Khon Kaen', 4001),
(29, 'บ้านไผ่', 'Ban Phai', 4002),
(29, 'พระยืน', 'Phra Yuen', 4003),
(29, 'หนองเรือ', 'Nong Ruea', 4004),
(29, 'ชุมแพ', 'Chum Phae', 4005),
(29, 'สีชมพู', 'Si Chomphu', 4006),
(29, 'น้ำพอง', 'Nam Phong', 4007),
(29, 'อุบลรัตน์', 'Ubolratana', 4008);

-- ============================================
-- ชลบุรี (Real Districts)
-- ============================================
INSERT INTO thai_districts (province_id, name_th, name_en, district_code) VALUES
(11, 'เมืองชลบุรี', 'Mueang Chon Buri', 2001),
(11, 'บางละมุง', 'Bang Lamung', 2002),
(11, 'ศรีราชา', 'Si Racha', 2003),
(11, 'เกาะสีชัง', 'Ko Sichang', 2004),
(11, 'สัตหีบ', 'Sattahip', 2005),
(11, 'บ่อทอง', 'Bo Thong', 2006),
(11, 'พานทอง', 'Phan Thong', 2007),
(11, 'หนองใหญ่', 'Nong Yai', 2008);

-- ============================================
-- สงขลา (Real Districts)
-- ============================================
INSERT INTO thai_districts (province_id, name_th, name_en, district_code) VALUES
(67, 'เมืองสงขลา', 'Mueang Songkhla', 9001),
(67, 'หาดใหญ่', 'Hat Yai', 9002),
(67, 'นาทวี', 'Na Thawi', 9003),
(67, 'เทพา', 'Thepha', 9004),
(67, 'สะบ้าย้อย', 'Saba Yoi', 9005),
(67, 'ระโนด', 'Ranot', 9006);

-- ============================================
-- Generate Subdistricts for Real Districts
-- ============================================

-- Chiang Mai subdistricts (sample)
INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode) VALUES
-- เมืองเชียงใหม่
((SELECT id FROM thai_districts WHERE name_th = 'เมืองเชียงใหม่'), 'ศรีภูมิ', 'Si Phum', '50200'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองเชียงใหม่'), 'พระสิงห์', 'Phra Sing', '50200'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองเชียงใหม่'), 'หายยา', 'Haiya', '50100'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองเชียงใหม่'), 'ช้างม่อย', 'Chang Moi', '50300'),
-- แม่ริม
((SELECT id FROM thai_districts WHERE name_th = 'แม่ริม'), 'แม่ริม', 'Mae Rim', '50180'),
((SELECT id FROM thai_districts WHERE name_th = 'แม่ริม'), 'ริมใต้', 'Rim Tai', '50180'),
((SELECT id FROM thai_districts WHERE name_th = 'แม่ริม'), 'สบเปิง', 'Saluang', '50180'),

-- Phuket subdistricts
-- เมืองภูเก็ต
((SELECT id FROM thai_districts WHERE name_th = 'เมืองภูเก็ต'), 'ตลาดใหญ่', 'Talat Yai', '83000'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองภูเก็ต'), 'ตลาดเหนือ', 'Talat Nuea', '83000'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองภูเก็ต'), 'รัษฎา', 'Ratsada', '83000'),
-- กะทู้
((SELECT id FROM thai_districts WHERE name_th = 'กะทู้'), 'กะทู้', 'Kathu', '83120'),
((SELECT id FROM thai_districts WHERE name_th = 'กะทู้'), 'กมลา', 'Kamala', '83150'),
((SELECT id FROM thai_districts WHERE name_th = 'กะทู้'), 'ป่าตอง', 'Patong', '83150'),

-- Khon Kaen subdistricts
-- เมืองขอนแก่น
((SELECT id FROM thai_districts WHERE name_th = 'เมืองขอนแก่น'), 'ในเมือง', 'Nai Mueang', '40000'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองขอนแก่น'), 'บ้านเป็ด', 'Ban Pet', '40000'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองขอนแก่น'), 'โนนศิลา', 'Non Sila', '40000'),

-- Chonburi subdistricts
-- เมืองชลบุรี
((SELECT id FROM thai_districts WHERE name_th = 'เมืองชลบุรี'), 'บ้านสวน', 'Ban Suan', '20000'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองชลบุรี'), 'มะขามหย่อง', 'Makham Yong', '20000'),
((SELECT id FROM thai_districts WHERE name_th = 'เมืองชลบุรี'), 'เสม็ด', 'Samet', '20000'),
-- บางละมุง
((SELECT id FROM thai_districts WHERE name_th = 'บางละมุง'), 'บางละมุง', 'Bang Lamung', '20150'),
((SELECT id FROM thai_districts WHERE name_th = 'บางละมุง'), 'หนองปรือ', 'Nong Prue', '20150'),
((SELECT id FROM thai_districts WHERE name_th = 'บางละมุง'), 'นาเกลือ', 'Na Kluea', '20150'),

-- Songkhla subdistricts
-- หาดใหญ่
((SELECT id FROM thai_districts WHERE name_th = 'หาดใหญ่'), 'หาดใหญ่', 'Hat Yai', '90110'),
((SELECT id FROM thai_districts WHERE name_th = 'หาดใหญ่'), 'คอหงส์', 'Kho Hong', '90110'),
((SELECT id FROM thai_districts WHERE name_th = 'หาดใหญ่'), 'คลองแห', 'Khlong Hae', '90110');

-- ============================================
-- For remaining provinces, create simple mock data
-- ============================================

-- Create basic "เมือง" district for provinces without real data
INSERT INTO thai_districts (province_id, name_th, name_en, district_code)
SELECT
    p.id,
    'เมือง' || p.name_th,
    'Mueang ' || p.name_en,
    (p.province_code * 100 + 1)::int
FROM thai_provinces p
WHERE p.id NOT IN (1, 11, 29, 39, 64, 67)  -- Skip provinces with real data
AND p.id NOT IN (SELECT DISTINCT province_id FROM thai_districts);

-- Create basic subdistricts for mock districts
INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode)
SELECT
    d.id,
    'ตำบลกลางเมือง',
    'Central Town',
    LPAD(p.province_code::text || '00', 5, '0')
FROM thai_districts d
JOIN thai_provinces p ON p.id = d.province_id
WHERE d.id NOT IN (SELECT DISTINCT district_id FROM thai_subdistricts);

SELECT
    'Real geography data created for major provinces:' as status,
    (SELECT COUNT(*) FROM thai_provinces) as provinces,
    (SELECT COUNT(*) FROM thai_districts) as districts,
    (SELECT COUNT(*) FROM thai_subdistricts) as subdistricts;