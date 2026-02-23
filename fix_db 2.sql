-- Add image_url column to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Test if column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'promotions'
AND column_name = 'image_url';

COMMENT ON COLUMN promotions.image_url IS 'URL of the promotion banner/preview image';