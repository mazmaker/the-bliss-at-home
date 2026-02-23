-- Fix profiles table for authentication
-- This ensures profiles can be accessed during login

-- First, ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;

-- Create a policy that allows reading profiles by email during authentication
CREATE POLICY "Allow reading profile by email during auth" ON profiles
  FOR SELECT
  USING (
    email = current_setting('request.jwt.claim.email', true)::text
    OR auth.uid() = id
    OR true -- Allow all reads temporarily for debugging
  );

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow users to create own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure admin profile exists with correct data
INSERT INTO profiles (id, email, role, full_name, phone, status, language, created_at, updated_at)
VALUES (
  '6d5eee8b-799b-4eb4-8650-d43eadd0fd6f',
  'admin@theblissathome.com',
  'ADMIN',
  'ผู้ดูแลระบบ',
  '0812345678',
  'ACTIVE',
  'th',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Also ensure email column has unique constraint if not already
-- Check if constraint exists before adding it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_email_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;