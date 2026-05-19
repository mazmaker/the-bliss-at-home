-- Migration: Create Thai Geography Tables
-- Description: Create missing tables for Thai provinces, districts, subdistricts
-- Based on existing thaiGeographyService.ts structure

-- ============================================
-- 1. Create thai_provinces table
-- ============================================

CREATE TABLE thai_provinces (
    id SERIAL PRIMARY KEY,
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    province_code INTEGER
);

-- ============================================
-- 2. Create thai_districts table
-- ============================================

CREATE TABLE thai_districts (
    id SERIAL PRIMARY KEY,
    province_id INTEGER NOT NULL REFERENCES thai_provinces(id),
    district_code INTEGER,
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL
);

-- ============================================
-- 3. Create thai_subdistricts table
-- ============================================

CREATE TABLE thai_subdistricts (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES thai_districts(id),
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    zipcode TEXT NOT NULL
);

-- ============================================
-- 4. Insert Thai Provinces (77 จังหวัด)
-- ============================================

INSERT INTO thai_provinces (name_th, name_en, province_code) VALUES
('กรุงเทพมหานคร', 'Bangkok', 10),
('สมุทรปราการ', 'Samut Prakan', 11),
('นนทบุรี', 'Nonthaburi', 12),
('ปทุมธานี', 'Pathum Thani', 13),
('พระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya', 14),
('อ่างทอง', 'Ang Thong', 15),
('ลพบุรี', 'Lopburi', 16),
('สิงห์บุรี', 'Sing Buri', 17),
('ชัยนาท', 'Chai Nat', 18),
('สระบุรี', 'Saraburi', 19),
('ชลบุรี', 'Chon Buri', 20),
('ระยอง', 'Rayong', 21),
('จันทบุรี', 'Chanthaburi', 22),
('ตราด', 'Trat', 23),
('ฉะเชิงเทรา', 'Chachoengsao', 24),
('ปราจีนบุรี', 'Prachin Buri', 25),
('นครนายก', 'Nakhon Nayok', 26),
('สระแก้ว', 'Sa Kaeo', 27),
('นครราชสีมา', 'Nakhon Ratchasima', 30),
('บุรีรัมย์', 'Buri Ram', 31),
('สุรินทร์', 'Surin', 32),
('ศรีสะเกษ', 'Si Sa Ket', 33),
('อุบลราชธานี', 'Ubon Ratchathani', 34),
('ยะโสธร', 'Yasothon', 35),
('ชัยภูมิ', 'Chaiyaphum', 36),
('อำนาจเจริญ', 'Amnat Charoen', 37),
('หนองบัวลำภู', 'Nong Bua Lam Phu', 39),
('ขอนแก่น', 'Khon Kaen', 40),
('อุดรธานี', 'Udon Thani', 41),
('เลย', 'Loei', 42),
('หนองคาย', 'Nong Khai', 43),
('มหาสารคาม', 'Maha Sarakham', 44),
('ร้อยเอ็ด', 'Roi Et', 45),
('กาฬสินธุ์', 'Kalasin', 46),
('สกลนคร', 'Sakon Nakhon', 47),
('นครพนม', 'Nakhon Phanom', 48),
('มุกดาหาร', 'Mukdahan', 49),
('เชียงใหม่', 'Chiang Mai', 50),
('ลำพูน', 'Lamphun', 51),
('ลำปาง', 'Lampang', 52),
('อุตรดิตถ์', 'Uttaradit', 53),
('แพร่', 'Phrae', 54),
('น่าน', 'Nan', 55),
('พะเยา', 'Phayao', 56),
('เชียงราย', 'Chiang Rai', 57),
('แม่ฮ่องสอน', 'Mae Hong Son', 58),
('นครสวรรค์', 'Nakhon Sawan', 60),
('อุทัยธานี', 'Uthai Thani', 61),
('กำแพงเพชร', 'Kamphaeng Phet', 62),
('ตาก', 'Tak', 63),
('สุโขทัย', 'Sukhothai', 64),
('พิษณุโลก', 'Phitsanulok', 65),
('พิจิตร', 'Phichit', 66),
('เพชรบูรณ์', 'Phetchabun', 67),
('ราชบุรี', 'Ratchaburi', 70),
('กาญจนบุรี', 'Kanchanaburi', 71),
('สุพรรณบุรี', 'Suphan Buri', 72),
('นครปฐม', 'Nakhon Pathom', 73),
('สมุทรสาคร', 'Samut Sakhon', 74),
('สมุทรสงคราม', 'Samut Songkhram', 75),
('เพชรบุรี', 'Phetchaburi', 76),
('ประจวบคีรีขันธ์', 'Prachuap Khiri Khan', 77),
('นครศรีธรรมราช', 'Nakhon Si Thammarat', 80),
('กระบี่', 'Krabi', 81),
('พังงา', 'Phang Nga', 82),
('ภูเก็ต', 'Phuket', 83),
('สุราษฎร์ธานี', 'Surat Thani', 84),
('ระนอง', 'Ranong', 85),
('ชุมพร', 'Chumphon', 86),
('สงขลา', 'Songkhla', 90),
('สตูล', 'Satun', 91),
('ตรัง', 'Trang', 92),
('พัทลุง', 'Phatthalung', 93),
('ปัตตานี', 'Pattani', 94),
('ยะลา', 'Yala', 95),
('นราธิวาส', 'Narathiwat', 96),
('บึงกาฬ', 'Bueng Kan', 38);

-- ============================================
-- 5. Create indexes for better performance
-- ============================================

CREATE INDEX idx_thai_provinces_name_th ON thai_provinces(name_th);
CREATE INDEX idx_thai_districts_province_id ON thai_districts(province_id);
CREATE INDEX idx_thai_districts_name_th ON thai_districts(name_th);
CREATE INDEX idx_thai_subdistricts_district_id ON thai_subdistricts(district_id);
CREATE INDEX idx_thai_subdistricts_zipcode ON thai_subdistricts(zipcode);

-- ============================================
-- 6. Sample districts for Bangkok (for testing)
-- ============================================

INSERT INTO thai_districts (province_id, name_th, name_en, district_code) VALUES
(1, 'พระนคร', 'Phra Nakhon', 1001),
(1, 'ดุสิต', 'Dusit', 1002),
(1, 'หนองจอก', 'Nong Chok', 1003),
(1, 'บางรัก', 'Bang Rak', 1004),
(1, 'บางเขน', 'Bang Khen', 1005),
(1, 'บางกะปิ', 'Bang Kapi', 1006),
(1, 'ปทุมวัน', 'Pathum Wan', 1007),
(1, 'ป้อมปราบศัตรูพ่าย', 'Pom Prap Sattru Phai', 1008),
(1, 'พระโขนง', 'Phra Khanong', 1009),
(1, 'มีนบุรี', 'Min Buri', 1010);

-- ============================================
-- 7. Sample subdistricts for testing (Bangkok districts)
-- ============================================

INSERT INTO thai_subdistricts (district_id, name_th, name_en, zipcode) VALUES
(1, 'พระบรมมหาราชวัง', 'Phra Borom Maha Ratchawang', '10200'),
(1, 'วัดราชบพิธ', 'Wat Ratchabophit', '10200'),
(1, 'สำราญราษฎร์', 'Samran Rat', '10200'),
(2, 'ดุสิต', 'Dusit', '10300'),
(2, 'วชิรพยาบาล', 'Wachiraphayaban', '10300'),
(2, 'สวนจิตรลดา', 'Suan Chitralada', '10300'),
(3, 'กระทุ่มล้ม', 'Krathum Lom', '10530'),
(3, 'หนองจอก', 'Nong Chok', '10530'),
(3, 'โคกแฟด', 'Khok Faet', '10530'),
(4, 'มหาพฤฒาราม', 'Maha Phruettharam', '10500'),
(4, 'สีลม', 'Silom', '10500'),
(4, 'สุริยวงศ์', 'Suriyawong', '10500'),
(7, 'ลุมพินี', 'Lumpini', '10330'),
(7, 'รองมวง', 'Rong Mueang', '10330'),
(7, 'วังใหม่', 'Wang Mai', '10330');

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE thai_provinces IS 'Thai provinces (77 จังหวัด) - matches thaiGeographyService.ts structure';
COMMENT ON TABLE thai_districts IS 'Thai districts/amphoes - matches thaiGeographyService.ts structure';
COMMENT ON TABLE thai_subdistricts IS 'Thai subdistricts/tambons with zipcodes - matches thaiGeographyService.ts structure';

SELECT 'Thai geography tables created with ' ||
       (SELECT COUNT(*) FROM thai_provinces) || ' provinces, ' ||
       (SELECT COUNT(*) FROM thai_districts) || ' districts, ' ||
       (SELECT COUNT(*) FROM thai_subdistricts) || ' subdistricts' as status;