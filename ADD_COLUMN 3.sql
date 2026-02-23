-- เพิ่ม column สำหรับ URL ของภาพโปรโมชั่น
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- เพิ่ม comment อธิบาย
COMMENT ON COLUMN promotions.image_url IS 'URL of the promotion banner/preview image';

-- ตรวจสอบว่าเพิ่มสำเร็จ
SELECT
  column_name,
  data_type,
  'SUCCESS! Column added to promotions table' as status
FROM information_schema.columns
WHERE table_name = 'promotions'
AND column_name = 'image_url';