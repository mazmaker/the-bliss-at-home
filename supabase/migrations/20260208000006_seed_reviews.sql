-- ============================================
-- Seed Mock Reviews Data
-- ============================================
-- Create realistic reviews for all active staff members

-- Insert mock reviews
INSERT INTO reviews (
  staff_id,
  customer_id,
  service_id,
  rating,
  review,
  cleanliness_rating,
  professionalism_rating,
  skill_rating,
  is_visible,
  created_at
)
SELECT
  s.id as staff_id,
  NULL as customer_id, -- We'll keep it null for mock data
  NULL as service_id,
  -- Random rating between 3-5 stars (mostly positive)
  (3 + floor(random() * 3))::int as rating,
  -- Random review text from predefined templates
  (ARRAY[
    'บริการดีมากค่ะ พนักงานมีความเป็นมืออาชีพสูง ทำงานละเอียดและใส่ใจ แนะนำเลยค่ะ',
    'พึงพอใจมากครับ เทคนิคดีมาก ผ่อนคลายได้จริง ราคาสมเหตุสมผล จะกลับมาใช้บริการอีกแน่นอน',
    'ประทับใจค่ะ พนักงานเป็นกันเอง สถานที่สะอาด อุปกรณ์ครบครัน มาตรฐานดีมาก',
    'ดีมากครับ มือเบาดี ใส่ใจในรายละเอียด แนะนำให้เพื่อนๆมาใช้บริการด้วย คุ้มค่าจริงๆ',
    'สุดยอดค่ะ ทักษะดีมาก ประสบการณ์เยี่ยม รู้สึกผ่อนคลายมากหลังทำเสร็จ ขอบคุณค่ะ',
    'บริการดีครับ พนักงานมีความรู้ความชำนาญ ทำงานเป็นระบบ จะมาใช้บริการอีก',
    'พอใจมากเลยค่ะ คุณภาพดี ทั้งบริการและการดูแล แนะนำเลยค่ะ ไม่ผิดหวัง',
    'ประทับใจค่ะ มาครั้งแรกแต่ไม่กลัวเลย พนักงานดีมาก อธิบายทุกขั้นตอน ราคาดีด้วย',
    'ดีมากครับ เป็นมืออาชีพ ใส่ใจลูกค้า สะอาด ปลอดภัย จะแนะนำให้คนรู้จักมาใช้บริการ',
    'สุดยอดค่ะ ทั้งบริการและความเป็นมิตร ราคาไม่แพง ได้มาตรฐานสากล ประทับใจมากค่ะ'
  ])[floor(random() * 10 + 1)] as review,
  -- Random sub-ratings
  (3 + floor(random() * 3))::int as cleanliness_rating,
  (3 + floor(random() * 3))::int as professionalism_rating,
  (3 + floor(random() * 3))::int as skill_rating,
  true as is_visible,
  -- Random created_at within last 6 months
  (NOW() - (random() * INTERVAL '180 days'))::timestamptz as created_at
FROM
  staff s
  INNER JOIN profiles p ON p.id = s.profile_id
  CROSS JOIN generate_series(1, 5 + floor(random() * 10)::int) as review_number -- 5-15 reviews per staff
WHERE
  p.role = 'STAFF'
  AND s.status = 'active';

-- Update staff total_reviews and rating based on reviews
UPDATE staff s
SET
  total_reviews = (
    SELECT COUNT(*)
    FROM reviews r
    WHERE r.staff_id = s.id
    AND r.is_visible = true
  ),
  rating = (
    SELECT COALESCE(AVG(r.rating), 0)
    FROM reviews r
    WHERE r.staff_id = s.id
    AND r.is_visible = true
  )
WHERE EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = s.profile_id
  AND p.role = 'STAFF'
  AND s.status = 'active'
);

-- Verify the data
SELECT 'Mock reviews created!' as status;
SELECT
  s.name_th,
  s.total_reviews,
  s.rating,
  COUNT(r.id) as actual_reviews
FROM staff s
LEFT JOIN reviews r ON r.staff_id = s.id
INNER JOIN profiles p ON p.id = s.profile_id
WHERE p.role = 'STAFF' AND s.status = 'active'
GROUP BY s.id, s.name_th, s.total_reviews, s.rating;
