-- Migration: Create Staff and Hotels Tables
-- Description: Service providers and partner hotels
-- Version: 004

-- ============================================
-- STAFF TABLE
-- ============================================

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level skill_level DEFAULT 'intermediate',
  years_experience INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, skill_id)
);

-- ============================================
-- HOTELS TABLE
-- ============================================

CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_available ON staff(is_available);
CREATE INDEX idx_staff_location ON staff(current_location_lat, current_location_lng);
CREATE INDEX idx_staff_profile ON staff(profile_id);
CREATE INDEX idx_staff_skills_staff ON staff_skills(staff_id);
CREATE INDEX idx_staff_skills_skill ON staff_skills(skill_id);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_email ON hotels(email);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

-- Staff policies
CREATE POLICY "Anyone can view active staff" ON staff
  FOR SELECT USING (status = 'active');

CREATE POLICY "Staff can update own profile" ON staff
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = staff.profile_id AND profiles.id = auth.uid())
  );

CREATE POLICY "Admins can manage staff" ON staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Staff skills policies
CREATE POLICY "Anyone can view staff skills" ON staff_skills
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage own skills" ON staff_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_skills.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage staff skills" ON staff_skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Hotels policies
CREATE POLICY "Anyone can view active hotels" ON hotels
  FOR SELECT USING (status = 'active');

CREATE POLICY "Hotel staff can view their hotel" ON hotels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'HOTEL')
  );

CREATE POLICY "Admins can manage hotels" ON hotels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON staff TO anon, authenticated;
GRANT SELECT ON staff_skills TO anon, authenticated;
GRANT SELECT ON hotels TO anon, authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE staff IS 'Service provider profiles';
COMMENT ON TABLE staff_skills IS 'Staff skills and certifications (many-to-many)';
COMMENT ON TABLE hotels IS 'Hotel/partner profiles';
