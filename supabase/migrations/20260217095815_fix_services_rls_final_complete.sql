-- Migration: Fix Services RLS Final Complete
-- Description: Completely fix services table RLS to allow hotel users to read services
-- Issue: Hotel users getting 401 Unauthorized when querying services
-- Solution: Create simple, comprehensive RLS policy for authenticated users

-- ============================================
-- 1. DROP ALL EXISTING CONFLICTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Authenticated can view services" ON services;
DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
DROP POLICY IF EXISTS "Services viewable by authenticated users" ON services;
DROP POLICY IF EXISTS "All authenticated users can view active services" ON services;
DROP POLICY IF EXISTS "Admins can view all services" ON services;
DROP POLICY IF EXISTS "authenticated_users_can_read_services_v3" ON services;

-- ============================================
-- 2. ENSURE RLS IS ENABLED
-- ============================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE SIMPLE, COMPREHENSIVE POLICY
-- ============================================

-- Policy 1: All authenticated users can read services
-- This is the simplest possible policy that works for all authenticated users
CREATE POLICY "authenticated_users_can_read_services_final_v1" ON services
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 4. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Ensure both anon and authenticated roles can select from services
GRANT SELECT ON services TO anon, authenticated;

-- ============================================
-- 5. ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON POLICY "authenticated_users_can_read_services_final_v1" ON services
  IS 'Allows all authenticated users (including HOTEL, ADMIN, CUSTOMER roles) to read services. Fixed 401 Unauthorized issue for Hotel App.';

COMMENT ON TABLE services
  IS 'Services table with RLS enabled. All authenticated users can read services for booking functionality.';