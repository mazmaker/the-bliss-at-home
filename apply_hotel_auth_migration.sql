-- Apply Hotel Auth Migration Manually
-- Copy and paste this SQL into Supabase Dashboard SQL Editor

-- เพิ่มฟิลด์สำหรับจัดการการล็อกอินของโรงแรม
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS login_email TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS login_enabled BOOLEAN DEFAULT false;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS temporary_password TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT false;

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_hotels_auth_user_id ON hotels(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_hotels_login_email ON hotels(login_email)
  WHERE login_email IS NOT NULL AND login_enabled = true;
CREATE INDEX IF NOT EXISTS idx_hotels_reset_token ON hotels(password_reset_token)
  WHERE password_reset_token IS NOT NULL;

-- เพิ่ม constraints
ALTER TABLE hotels ADD CONSTRAINT IF NOT EXISTS unique_hotels_login_email
  UNIQUE(login_email);
ALTER TABLE hotels ADD CONSTRAINT IF NOT EXISTS unique_hotels_auth_user_id
  UNIQUE(auth_user_id);