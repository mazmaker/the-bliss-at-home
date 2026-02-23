-- Fix Services RLS Policy
-- Allow HOTEL, ADMIN, and CUSTOMER roles to view services

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
DROP POLICY IF EXISTS "Services viewable by authenticated users" ON services;

-- Create comprehensive policy for active services
CREATE POLICY "All authenticated users can view active services"
ON services FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('HOTEL', 'ADMIN', 'CUSTOMER')
  )
);

-- Also allow viewing inactive services for admin
CREATE POLICY "Admins can view all services"
ON services FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'
  )
);