-- 🗄️ CREATE STORAGE BUCKET FOR PROMOTIONS
-- Copy and run in Supabase SQL Editor: https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/sql

-- 1. Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('promotion-images', 'promotion-images', true);

-- 2. Create RLS policy for storage bucket (allow all operations)
CREATE POLICY "Allow all operations for promotion-images" ON storage.objects
FOR ALL USING (bucket_id = 'promotion-images');

-- 3. Verify bucket creation
SELECT 'Storage bucket created successfully!' as message;