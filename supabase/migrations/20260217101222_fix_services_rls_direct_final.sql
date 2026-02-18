-- Fix Services RLS Direct Final
-- Issue: Hotel users getting 401 Unauthorized when querying services
-- Solution: Enable RLS and create policy for authenticated users

-- Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Authenticated can view services" ON services;
DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
DROP POLICY IF EXISTS "All authenticated users can view active services" ON services;
DROP POLICY IF EXISTS "Admins can view all services" ON services;
DROP POLICY IF EXISTS "authenticated_users_can_read_services_v3" ON services;
DROP POLICY IF EXISTS "authenticated_users_can_read_services_final_v1" ON services;
DROP POLICY IF EXISTS "services_read_by_authenticated" ON services;
DROP POLICY IF EXISTS "services_readable_by_authenticated_users" ON services;
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON services;
DROP POLICY IF EXISTS "authenticated_users_can_read_services_FINAL" ON services;

-- Create the final working policy
CREATE POLICY "authenticated_users_can_read_services_WORKING" ON services
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT ON services TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comment
COMMENT ON POLICY "authenticated_users_can_read_services_WORKING" ON services
  IS 'Allows all authenticated users to read services. Fixes 401 Unauthorized error in Hotel App.';