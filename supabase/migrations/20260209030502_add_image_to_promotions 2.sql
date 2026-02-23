-- Add image_url column to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for promotion images
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotion-images', 'promotion-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to promotion images bucket
CREATE POLICY "Promotion images are publicly accessible" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'promotion-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload promotion images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'promotion-images' AND
    auth.role() = 'authenticated'
  );

-- Allow admin users to update promotion images
CREATE POLICY "Admin users can update promotion images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'promotion-images' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
  );

-- Allow admin users to delete promotion images
CREATE POLICY "Admin users can delete promotion images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'promotion-images' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
  );

COMMENT ON COLUMN promotions.image_url IS 'URL of the promotion banner/preview image';