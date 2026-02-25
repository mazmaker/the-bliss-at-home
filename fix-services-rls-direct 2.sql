-- Fix Services RLS Policy for Hotel App
-- Allow all authenticated users to view services

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Authenticated can view services" ON services;
DROP POLICY IF EXISTS "Authenticated users can view services" ON services;

-- Create a simple policy that allows ALL users to read services
CREATE POLICY "Public access to services" ON services
  FOR SELECT USING (true);

-- Grant permissions to anon and authenticated users
GRANT SELECT ON services TO anon, authenticated;

-- Test query to verify services are accessible
SELECT id, name_th, name_en, category, base_price, is_active
FROM services
WHERE is_active = true
ORDER BY sort_order ASC
LIMIT 5;