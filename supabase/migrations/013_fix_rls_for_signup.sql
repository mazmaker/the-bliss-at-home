-- Fix RLS policies to allow user registration
-- This allows users to be created and profiles to be inserted

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Allow users to insert their own profile (after signup)
-- This works with Supabase Auth trigger that creates the profile
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Allow service role to do everything
CREATE POLICY "Service role can manage profiles"
ON profiles
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO anon, authenticated;
GRANT ALL ON TABLE profiles TO service_role;
