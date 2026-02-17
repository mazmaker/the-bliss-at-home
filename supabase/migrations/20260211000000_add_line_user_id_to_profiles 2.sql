-- Add line_user_id column to profiles table for LINE Login support
-- This allows staff users to login with their LINE account

-- Add column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_line_user_id_idx ON profiles(line_user_id);

-- Add comment
COMMENT ON COLUMN profiles.line_user_id IS 'LINE user ID for LINE Login integration (staff users)';
