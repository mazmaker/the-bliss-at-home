-- Add hotel authentication columns to hotels table
-- Migration: add hotel authentication support

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS login_email TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS login_enabled BOOLEAN DEFAULT false;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS temporary_password TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT true;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_hotels_auth_user_id ON hotels(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_hotels_login_email ON hotels(login_email);

-- Add comment for documentation
COMMENT ON COLUMN hotels.auth_user_id IS 'Reference to Supabase auth user';
COMMENT ON COLUMN hotels.login_email IS 'Email used for hotel login (may differ from contact email)';
COMMENT ON COLUMN hotels.login_enabled IS 'Whether hotel login is enabled';
COMMENT ON COLUMN hotels.temporary_password IS 'Temporary password for admin reference';
COMMENT ON COLUMN hotels.password_change_required IS 'Whether hotel must change password on first login';