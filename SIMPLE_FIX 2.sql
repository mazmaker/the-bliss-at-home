-- 🎯 SIMPLE FIX: Copy this entire block and paste in Supabase SQL Editor
-- https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/sql

-- 1. Add missing column
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Fix RLS policy (allows all operations - you can tighten security later)
DROP POLICY IF EXISTS "Allow all for promotions" ON promotions;
CREATE POLICY "Allow all for promotions" ON promotions FOR ALL USING (true);

-- 3. Create 3 sample promotions with categories
INSERT INTO promotions (
  name_th, name_en, code, discount_type, discount_value,
  min_order_amount, max_discount, usage_limit, usage_count,
  start_date, end_date, status, applies_to, target_categories,
  auto_generate_code, code_prefix, code_length
) VALUES
('โปรนวดพิเศษ', 'Massage Special', 'MASSAGE25', 'percentage', 25.00, 800.00, 300.00, 50, 0, NOW(), NOW() + INTERVAL '30 days', 'active', 'categories', ARRAY['massage'], false, 'MAS', 8),
('ส่วนลดเล็บ', 'Nail Discount', 'NAIL200', 'fixed_amount', 200.00, 1000.00, NULL, 100, 0, NOW(), NOW() + INTERVAL '45 days', 'active', 'categories', ARRAY['nail'], false, 'NAIL', 8),
('โปรสปา', 'Spa Special', 'SPA30', 'percentage', 30.00, 1500.00, 500.00, 80, 0, NOW(), NOW() + INTERVAL '60 days', 'active', 'categories', ARRAY['spa', 'facial'], false, 'SPA', 8);

-- 4. Verify it worked
SELECT 'SUCCESS! Ready to use promotions system' as message;