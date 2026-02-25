-- Insert sample staff data for testing
INSERT INTO staff (id, name_th, phone, status, rating, total_reviews, total_jobs, total_earnings, is_available)
VALUES
  ('STF001', 'สมหญิง นวดเก่ง', '081-234-5678', 'active', 4.8, 156, 1250, 450000, true),
  ('STF002', 'ดอกไม้ ทำเล็บสวย', '082-345-6789', 'active', 4.9, 203, 890, 320000, true),
  ('STF003', 'แก้ว สปาชำนาญ', '083-456-7890', 'active', 4.7, 89, 670, 520000, true),
  ('STF004', 'มานี รอดำเนินการ', '084-567-8901', 'pending', 0, 0, 0, 0, false),
  ('STF005', 'สมชาย มือใหม่', '085-678-9012', 'pending', 0, 0, 0, 0, false)
ON CONFLICT (id) DO NOTHING;

-- Add skills to staff (if skills exist)
INSERT INTO staff_skills (staff_id, skill_id, level, years_experience)
SELECT 'STF001', 'massage', 'expert', 5
WHERE EXISTS (SELECT 1 FROM skills WHERE id = 'massage')
ON CONFLICT DO NOTHING;

INSERT INTO staff_skills (staff_id, skill_id, level, years_experience)
SELECT 'STF002', 'nail', 'advanced', 3
WHERE EXISTS (SELECT 1 FROM skills WHERE id = 'nail')
ON CONFLICT DO NOTHING;

INSERT INTO staff_skills (staff_id, skill_id, level, years_experience)
SELECT 'STF003', 'spa', 'expert', 7
WHERE EXISTS (SELECT 1 FROM skills WHERE id = 'spa')
ON CONFLICT DO NOTHING;

INSERT INTO staff_skills (staff_id, skill_id, level, years_experience)
SELECT 'STF003', 'massage', 'intermediate', 4
WHERE EXISTS (SELECT 1 FROM skills WHERE id = 'massage')
ON CONFLICT DO NOTHING;

INSERT INTO staff_skills (staff_id, skill_id, level, years_experience)
SELECT 'STF004', 'nail', 'intermediate', 2
WHERE EXISTS (SELECT 1 FROM skills WHERE id = 'nail')
ON CONFLICT DO NOTHING;

INSERT INTO staff_skills (staff_id, skill_id, level, years_experience)
SELECT 'STF005', 'massage', 'beginner', 1
WHERE EXISTS (SELECT 1 FROM skills WHERE id = 'massage')
ON CONFLICT DO NOTHING;