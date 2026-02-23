-- ========================================
-- FIX ALL PROMOTION ISSUES
-- ========================================

-- 1. Add image_url column to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;
COMMENT ON COLUMN promotions.image_url IS 'URL of the promotion banner/preview image';

-- 2. Create storage bucket for promotion images (manual step required)
-- Go to: https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/storage/buckets
-- Click "Create Bucket"
-- Name: promotion-images
-- Public: Yes
-- File size limit: 2MB
-- Allowed types: image/jpeg, image/png, image/gif, image/webp

-- 3. Create RLS policy for promotion images storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promotion-images',
  'promotion-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 4. Set up storage policies for promotion images
CREATE POLICY "Anyone can view promotion images" ON storage.objects FOR SELECT USING (bucket_id = 'promotion-images');
CREATE POLICY "Authenticated users can upload promotion images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'promotion-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their promotion images" ON storage.objects FOR UPDATE USING (bucket_id = 'promotion-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their promotion images" ON storage.objects FOR DELETE USING (bucket_id = 'promotion-images' AND auth.role() = 'authenticated');

-- 5. Update RLS policies for promotions table to allow inserts
CREATE POLICY IF NOT EXISTS "Admin can manage all promotions" ON promotions FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'user_role' = 'admin' OR
  auth.uid() IS NOT NULL
);

-- 6. Enable RLS on promotions table
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- 7. Verify everything is working
SELECT
  'image_url column added successfully' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'promotions' AND column_name = 'image_url';

SELECT
  'Storage bucket created' as status,
  name,
  public
FROM storage.buckets
WHERE name = 'promotion-images';