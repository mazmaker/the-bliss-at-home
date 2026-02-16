-- Migration: Add Hotel Authentication Fields
-- Description: Add authentication-related fields to hotels table for login management
-- Version: 20260213071105

-- ============================================
-- ADD AUTHENTICATION FIELDS TO HOTELS TABLE
-- ============================================

-- เพิ่มฟิลด์สำหรับจัดการการล็อกอินของโรงแรม
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS login_email TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS login_enabled BOOLEAN DEFAULT false;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS temporary_password TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT false;

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index สำหรับ auth_user_id (foreign key lookup)
CREATE INDEX IF NOT EXISTS idx_hotels_auth_user_id ON hotels(auth_user_id);

-- Index สำหรับ login_email (login lookup)
CREATE INDEX IF NOT EXISTS idx_hotels_login_email ON hotels(login_email)
  WHERE login_email IS NOT NULL AND login_enabled = true;

-- Index สำหรับ password_reset_token (password reset lookup)
CREATE INDEX IF NOT EXISTS idx_hotels_reset_token ON hotels(password_reset_token)
  WHERE password_reset_token IS NOT NULL;

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- Unique constraint สำหรับ login_email (ป้องกัน email ซ้ำ)
ALTER TABLE hotels ADD CONSTRAINT IF NOT EXISTS unique_hotels_login_email
  UNIQUE(login_email);

-- Unique constraint สำหรับ auth_user_id (one-to-one relationship)
ALTER TABLE hotels ADD CONSTRAINT IF NOT EXISTS unique_hotels_auth_user_id
  UNIQUE(auth_user_id);

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON COLUMN hotels.auth_user_id IS 'Reference to Supabase auth user for hotel login';
COMMENT ON COLUMN hotels.login_email IS 'Email used for hotel login (can differ from contact email)';
COMMENT ON COLUMN hotels.password_reset_token IS 'Token for password reset verification';
COMMENT ON COLUMN hotels.password_reset_expires_at IS 'Expiration time for password reset token';
COMMENT ON COLUMN hotels.last_login IS 'Timestamp of last successful login';
COMMENT ON COLUMN hotels.login_enabled IS 'Whether hotel login is enabled';
COMMENT ON COLUMN hotels.temporary_password IS 'Temporary password for first-time login';
COMMENT ON COLUMN hotels.password_change_required IS 'Whether password change is required on next login';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- เช็คว่าคอลัมน์ใหม่ถูกเพิ่มแล้ว
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'hotels'
--   AND column_name IN ('auth_user_id', 'login_email', 'login_enabled', 'last_login');

-- ตรวจสอบ indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'hotels'
--   AND indexname LIKE 'idx_hotels_%';