-- Migration: Create Settings Table and Initial Data
-- Description: App settings and seed data for skills and services
-- Version: 009

-- ============================================
-- SETTINGS TABLE
-- ============================================

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_settings_key ON settings(key);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Anyone can view settings" ON settings
  FOR SELECT USING (true);

-- Admins can manage settings
CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON settings TO anon, authenticated;

-- ============================================
-- VIEWS
-- ============================================

-- Active bookings view
CREATE VIEW active_bookings AS
SELECT
  b.*,
  s.name_th AS service_name,
  s.name_en AS service_name_en,
  st.name_th AS staff_name,
  h.name_th AS hotel_name,
  c.full_name AS customer_name,
  c.phone AS customer_phone
FROM bookings b
JOIN services s ON b.service_id = s.id
LEFT JOIN staff st ON b.staff_id = st.id
LEFT JOIN hotels h ON b.hotel_id = h.id
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.status NOT IN ('completed', 'cancelled');

-- Staff earnings summary
CREATE VIEW staff_earnings_summary AS
SELECT
  st.id,
  st.name_th,
  st.name_en,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(b.final_price), 0) AS total_revenue,
  COALESCE(SUM(b.staff_earnings), 0) AS total_earnings,
  COALESCE(SUM(b.tip_amount), 0) AS total_tips,
  COALESCE(AVG(rv.rating), 0) AS average_rating
FROM staff st
LEFT JOIN bookings b ON b.staff_id = st.id AND b.status = 'completed'
LEFT JOIN reviews rv ON rv.staff_id = st.id
GROUP BY st.id, st.name_th, st.name_en;

-- Hotel performance summary
CREATE VIEW hotel_performance_summary AS
SELECT
  h.id,
  h.name_th,
  h.name_en,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(b.final_price), 0) AS total_revenue,
  COALESCE(SUM(b.discount_amount), 0) AS total_savings,
  h.commission_rate,
  COALESCE(AVG(rv.rating), 0) AS average_rating
FROM hotels h
LEFT JOIN bookings b ON b.hotel_id = h.id AND b.status = 'completed'
LEFT JOIN reviews rv ON rv.booking_id IN (
  SELECT id FROM bookings WHERE hotel_id = h.id
)
WHERE h.status = 'active'
GROUP BY h.id, h.name_th, h.name_en, h.commission_rate;

-- Service popularity
CREATE VIEW service_popularity AS
SELECT
  s.id,
  s.name_th,
  s.name_en,
  s.category,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(b.final_price), 0) AS total_revenue,
  COALESCE(AVG(rv.rating), 0) AS average_rating
FROM services s
LEFT JOIN bookings b ON b.service_id = s.id AND b.status = 'completed'
LEFT JOIN reviews rv ON rv.service_id = s.id
WHERE s.is_active = true
GROUP BY s.id, s.name_th, s.name_en, s.category
ORDER BY total_bookings DESC;

-- Daily revenue report
CREATE VIEW daily_revenue AS
SELECT
  DATE(b.created_at) AS date,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'completed') AS completed_bookings,
  COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) AS revenue
FROM bookings b
GROUP BY DATE(b.created_at)
ORDER BY date DESC;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default skills
INSERT INTO skills (name_th, name_en, category, icon) VALUES
('นวดไทย', 'Thai Massage', 'massage', 'sparkles'),
('นวดน้ำมัน', 'Oil Massage', 'massage', 'droplets'),
('นวดเท้า', 'Foot Massage', 'massage', 'footprints'),
('เล็บเจล', 'Gel Manicure', 'nail', 'flower2'),
('เล็บอคริลิค', 'Acrylic Nails', 'nail', 'flower2'),
('สปาไทย', 'Thai Spa', 'spa', 'sparkles'),
('สปาอโรเมติก', 'Aromatic Spa', 'spa', 'droplets'),
('ทรีตเมนท์หน้า', 'Facial Treatment', 'facial', 'face');

-- Insert default services
INSERT INTO services (name_th, name_en, description_th, description_en, category, duration, base_price, hotel_price, sort_order) VALUES
('นวดไทย (2 ชั่วโมง)', 'Thai Massage (2 hours)', 'นวดแผนไทยแท้โดยผู้เชี่ยวชาญ ช่วยผ่อนคลายและฟื้นฟูร่างกาย', 'Traditional Thai massage by experts to relax and rejuvenate', 'massage', 120, 800, 640, 1),
('นวดน้ำมัน (2 ชั่วโมง)', 'Oil Massage (2 hours)', 'นวดน้ำมันอโรเมติกาบำบัดคลายเครียด ด้วยน้ำมันหอมระเหย', 'Aromatic oil massage to relieve stress with fragrant oils', 'massage', 120, 1000, 800, 2),
('นวดเท้า (1 ชั่วโมง)', 'Foot Massage (1 hour)', 'นวดเท้าผ่อนคลาย กำจัดความเมื่อยล้า', 'Relaxing foot massage to eliminate fatigue', 'massage', 60, 400, 320, 3),
('เล็บเจล', 'Gel Manicure', 'ทำเล็บเจลเกรดพรีเมียมพร้อมดีไซน์ทันสมัย', 'Premium gel manicure with modern designs', 'nail', 60, 450, 360, 4),
('เล็บอคริลิค', 'Acrylic Nails', 'เล็บอคริลิคแข็งแรง ทนทาน รูปทรงสวยงาม', 'Durable acrylic nails with beautiful shapes', 'nail', 90, 550, 440, 5),
('สปาไทย', 'Thai Spa', 'แพ็กเกจสปาครบวงจร นวด สครับ และทรีตเมนท์', 'Complete spa package: massage, scrub, and treatment', 'spa', 150, 2500, 2000, 6),
('สปาอโรเมติก', 'Aromatic Spa', 'สปาบำบัดด้วยน้ำมันหอมระเหย ผ่อนคลายเต็มรูปแบบ', 'Full relaxation spa with aromatic oils', 'spa', 120, 2000, 1600, 7),
('ทรีตเมนท์หน้า', 'Facial Treatment', 'ทรีตเมนท์บำบัดผิวหน้าด้วยผลิตภัณฑ์ออร์แกนิค', 'Facial treatment with organic products', 'facial', 90, 1200, 960, 8);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('commission_rate', '{"rate": 20}', 'Default commission rate for hotel partners'),
('tax_rate', '{"rate": 7}', 'Tax rate for bookings'),
('currency', '{"code": "THB", "symbol": "฿"}', 'Default currency'),
('auto_accept_staff', '{"enabled": false}', 'Auto-accept new staff registrations'),
('min_booking_hours', '{"hours": 2}', 'Minimum hours in advance for booking'),
('cancellation_hours', '{"hours": 24}', 'Hours allowed for cancellation'),
('service_radius_km', '{"radius": 50}', 'Default service radius for providers in km'),
('platform_fee_percent', '{"rate": 15}', 'Platform fee percentage');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE settings IS 'App-wide configuration settings';
COMMENT ON VIEW active_bookings IS 'View of all non-completed/cancelled bookings';
COMMENT ON VIEW staff_earnings_summary IS 'Summary of staff earnings and ratings';
COMMENT ON VIEW hotel_performance_summary IS 'Summary of hotel performance';
COMMENT ON VIEW service_popularity IS 'Service popularity by booking count';
COMMENT ON VIEW daily_revenue IS 'Daily revenue report';
