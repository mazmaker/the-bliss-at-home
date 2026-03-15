-- เพิ่ม hotel_slug column ในตาราง hotels
-- Migration: 20260216120000_add_hotel_slug_column.sql
-- Created: 2026-02-16 for dynamic hotel slug support

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
  WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN 'dusit-thani-bangkok'
  ELSE LOWER(REPLACE(REPLACE(name_en, ' ', '-'), '.', ''))
END;

-- สร้าง constraint เพื่อให้แน่ใจว่า slug ไม่ซ้ำและไม่เป็น null
ALTER TABLE hotels
ADD CONSTRAINT hotels_slug_not_null CHECK (hotel_slug IS NOT NULL),
ADD CONSTRAINT hotels_slug_unique UNIQUE (hotel_slug);

-- สร้างฟังก์ชันสำหรับสร้าง slug อัตโนมัติสำหรับโรงแรมใหม่
CREATE OR REPLACE FUNCTION generate_hotel_slug(hotel_name_en TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- สร้าง base slug จากชื่อภาษาอังกฤษ
  base_slug := LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(hotel_name_en, '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      )
    )
  );

  final_slug := base_slug;

  -- ตรวจสอบว่า slug ซ้ำหรือไม่
  WHILE EXISTS (SELECT 1 FROM hotels WHERE hotel_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับสร้าง slug อัตโนมัติ
CREATE OR REPLACE FUNCTION set_hotel_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- ถ้าไม่มี slug ให้สร้างใหม่
  IF NEW.hotel_slug IS NULL AND NEW.name_en IS NOT NULL THEN
    NEW.hotel_slug := generate_hotel_slug(NEW.name_en);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_hotel_slug
  BEFORE INSERT ON hotels
  FOR EACH ROW
  EXECUTE FUNCTION set_hotel_slug();

-- เพิ่ม comment สำหรับ documentation
COMMENT ON COLUMN hotels.hotel_slug IS 'URL-friendly slug for hotel (auto-generated from name_en)';
COMMENT ON FUNCTION generate_hotel_slug(TEXT) IS 'Generates unique URL-friendly slug from hotel English name';