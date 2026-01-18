-- Migration: Fix Profile Policies Recursion
-- Description: Fix infinite recursion in profile policies
-- Version: 011

-- Drop problematic policies that reference profiles within profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Recreate with direct role check (not subquery)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (role = 'ADMIN');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (role = 'ADMIN');
