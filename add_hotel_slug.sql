-- เพิ่ม hotel_slug column ในตาราง hotels
ALTER TABLE hotels
ADD COLUMN hotel_slug VARCHAR(50) UNIQUE;

-- เพิ่ม index สำหรับ performance
CREATE INDEX idx_hotels_slug ON hotels(hotel_slug);

-- อัพเดทข้อมูลที่มีอยู่
UPDATE hotels
SET hotel_slug = CASE
  WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN 'grand-palace-bangkok'
  WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN 'resort-chiang-mai'
  ELSE LOWER(REPLACE(name_en, ' ', '-'))
END;

-- สร้าง constraint เพื่อให้แน่ใจว่า slug ไม่ซ้ำและไม่เป็น null
ALTER TABLE hotels
ADD CONSTRAINT hotels_slug_not_null CHECK (hotel_slug IS NOT NULL),
ADD CONSTRAINT hotels_slug_unique UNIQUE (hotel_slug);