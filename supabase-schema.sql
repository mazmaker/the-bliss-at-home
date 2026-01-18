-- ============================================
-- The Bliss at Home - Supabase Database Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin', 'hotel');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded');

-- Service category
CREATE TYPE service_category AS ENUM ('massage', 'nail', 'spa', 'facial');

-- Staff status
CREATE TYPE staff_status AS ENUM ('active', 'inactive', 'pending');

-- Hotel status
CREATE TYPE hotel_status AS ENUM ('active', 'inactive', 'pending');

-- Skill level
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  line_user_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  category service_category NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  base_price DECIMAL(10,2) NOT NULL, -- regular price for customers
  hotel_price DECIMAL(10,2) NOT NULL, -- discounted price for hotels
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service images (multiple images per service)
CREATE TABLE service_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills table (for staff capabilities)
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category service_category NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff profiles
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  name_th TEXT NOT NULL,
  name_en TEXT,
  phone TEXT NOT NULL,
  id_card TEXT UNIQUE,
  address TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  bio_th TEXT,
  bio_en TEXT,
  avatar_url TEXT,
  status staff_status DEFAULT 'pending',
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  current_location_lat DECIMAL(10,8),
  current_location_lng DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff skills (many-to-many)
CREATE TABLE staff_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level skill_level DEFAULT 'intermediate',
  years_experience INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, skill_id)
);

-- Hotels/Partners
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT UNIQUE,
  bank_name TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  commission_rate INTEGER DEFAULT 20, -- percentage discount for hotels
  status hotel_status DEFAULT 'pending',
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  monthly_revenue DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  date_of_birth DATE,
  preferences JSONB DEFAULT '{}', -- store customer preferences
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_booking_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES services(id),

  -- Booking details
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes

  -- Location
  is_hotel_booking BOOLEAN DEFAULT false,
  hotel_room_number TEXT,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,

  -- Status
  status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',

  -- Staff earnings
  staff_earnings DECIMAL(10,2) DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0,

  -- Notes
  customer_notes TEXT,
  staff_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,

  -- Service ratings
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  skill_rating INTEGER CHECK (skill_rating >= 1 AND skill_rating <= 5),

  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'booking', 'promotion', 'system', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly bills for hotels
CREATE TABLE monthly_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  bill_number TEXT UNIQUE NOT NULL,

  -- Billing period
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Totals
  total_bookings INTEGER DEFAULT 0,
  total_base_price DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  due_date DATE,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, month, year)
);

-- Payouts for staff
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  payout_number TEXT UNIQUE NOT NULL,

  -- Payout period
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Totals
  total_bookings INTEGER DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  total_tips DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'paid'
  paid_at TIMESTAMPTZ,
  transfer_receipt TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month, year)
);

-- Settings (app-wide configuration)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Services
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);

-- Staff
CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_available ON staff(is_available);
CREATE INDEX idx_staff_location ON staff(current_location_lat, current_location_lng);

-- Hotels
CREATE INDEX idx_hotels_status ON hotels(status);

-- Bookings
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX idx_bookings_staff ON bookings(staff_id);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_number ON bookings(booking_number);

-- Reviews
CREATE INDEX idx_reviews_staff ON reviews(staff_id);
CREATE INDEX idx_reviews_service ON reviews(service_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'BK' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('booking_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE booking_number_seq START 1;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Services policies (public read, admin write)
CREATE POLICY "Anyone can view services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service images policy" ON service_images
  FOR SELECT USING (true);

-- Skills policies
CREATE POLICY "Anyone can view skills" ON skills
  FOR SELECT USING (true);

-- Staff policies
CREATE POLICY "Anyone can view staff" ON staff
  FOR SELECT USING (status = 'active');

CREATE POLICY "Staff can update own profile" ON staff
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = staff.profile_id AND profiles.id = auth.uid())
  );

-- Hotels policies
CREATE POLICY "Anyone can view active hotels" ON hotels
  FOR SELECT USING (status = 'active');

-- Customers policies
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = customers.profile_id AND profiles.id = auth.uid())
  );

-- Bookings policies
CREATE POLICY "Customers can view own bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = bookings.customer_id
      AND customers.profile_id = (SELECT id FROM profiles WHERE auth.uid() = profiles.id)
    )
  );

CREATE POLICY "Staff can view assigned bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = bookings.staff_id AND staff.profile_id = (SELECT id FROM profiles WHERE auth.uid() = profiles.id))
  );

CREATE POLICY "Hotels can view their bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM hotels WHERE hotels.id = bookings.hotel_id)
  );

-- Reviews policies
CREATE POLICY "Anyone can view visible reviews" ON reviews
  FOR SELECT USING (is_visible = true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

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
('cancellation_hours', '{"hours": 24}', 'Hours allowed for cancellation');

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
LEFT JOIN reviews rv ON rv.hotel_id = h.id
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
