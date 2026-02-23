-- Migration: Add LINE account linking columns to profiles table
-- Description: Allow users to link their LINE account to existing profile
-- Version: 20260212000000

-- ============================================
-- Add LINE linking columns to profiles table
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS line_display_name TEXT,
ADD COLUMN IF NOT EXISTS line_picture_url TEXT;

-- Create index for faster LINE user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);

-- Add comment
COMMENT ON COLUMN profiles.line_user_id IS 'LINE User ID - for account linking';
COMMENT ON COLUMN profiles.line_display_name IS 'LINE Display Name';
COMMENT ON COLUMN profiles.line_picture_url IS 'LINE Profile Picture URL';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Added LINE account linking columns to profiles table';
END $$;
