-- Add image_url column to promotions table for storing promotion banner images
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN promotions.image_url IS 'URL of the promotion banner/preview image uploaded to Supabase Storage';

-- Create index for better query performance when filtering by image presence
CREATE INDEX IF NOT EXISTS idx_promotions_image_url ON promotions(image_url) WHERE image_url IS NOT NULL;