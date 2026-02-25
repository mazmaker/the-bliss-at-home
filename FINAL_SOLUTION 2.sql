-- 🎯 FINAL SOLUTION: Copy and run in Supabase SQL Editor
-- https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/sql

-- 1. Add image_url column
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Fix RLS policy to allow all operations (temporary for testing)
DROP POLICY IF EXISTS "Allow all for promotions" ON promotions;
CREATE POLICY "Allow all for promotions" ON promotions FOR ALL USING (true);

-- 3. Create sample promotions with categories
INSERT INTO promotions (
  name_th, name_en, description_th, description_en, code,
  discount_type, discount_value, min_order_amount, max_discount,
  usage_limit, usage_count, start_date, end_date, status,
  applies_to, target_categories, auto_generate_code, code_prefix, code_length,
  image_url
) VALUES
(
  'โปรโมชั่นนวดพิเศษ',
  'Massage Special',
  'ลด 25% สำหรับบริการนวดทุกประเภท',
  'Get 25% off for all massage services',
  'MASSAGE25',
  'percentage', 25.00, 800.00, 300.00,
  50, 0, NOW(), NOW() + INTERVAL '30 days', 'active',
  'categories', ARRAY['massage'], false, 'MAS', 8,
  'https://via.placeholder.com/400x200/10b981/ffffff?text=Massage+25%25'
),
(
  'ส่วนลดเล็บสุดคุ้ม',
  'Nail Discount',
  'ลด 200 บาท สำหรับบริการเล็บทุกประเภท',
  'Get 200 THB off for all nail services',
  'NAIL200',
  'fixed_amount', 200.00, 1000.00, NULL,
  100, 0, NOW(), NOW() + INTERVAL '45 days', 'active',
  'categories', ARRAY['nail'], false, 'NAIL', 8,
  'https://via.placeholder.com/400x200/ec4899/ffffff?text=Nail+-200+THB'
),
(
  'โปรสปา + เฟเชียล',
  'Spa & Facial Combo',
  'ลด 30% สำหรับบริการสปาและเฟเชียล',
  'Get 30% off for spa and facial services',
  'SPAWELL30',
  'percentage', 30.00, 1500.00, 500.00,
  80, 0, NOW(), NOW() + INTERVAL '60 days', 'active',
  'categories', ARRAY['spa', 'facial'], false, 'SPA', 8,
  'https://via.placeholder.com/400x200/8b5cf6/ffffff?text=Spa+%26+Facial+30%25'
);

-- 4. Create storage bucket (run separately if needed)
-- This might need to be done through Supabase Dashboard > Storage > Create Bucket
-- Name: promotion-images
-- Public: Yes
-- File size limit: 2MB

-- 5. Verify everything works
SELECT
  code, name_th, discount_type, discount_value,
  applies_to, target_categories, image_url
FROM promotions
ORDER BY created_at DESC;

-- Success message
SELECT '🎉 SYSTEM IS READY! Go to http://localhost:3001/admin/promotions' as message;